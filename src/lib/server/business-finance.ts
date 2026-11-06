import { getDb } from "./db";
import { requireStaff } from "./settlements";
import { BookingError } from "./partner-bookings";
import { getActivePartner } from "./listings";
import { commissionFromPercent, financePeriod } from "../finance";
import { omiseMode } from "./omise";

export type FinancialBooking = {
  id: string;
  title: string;
  business_name: string;
  partner_id: string;
  status: string;
  paid_satang: string;
  refunded_satang: string;
  rental_satang: string;
  deposit_held_satang: string;
  commission_bps: number;
  company_satang: string;
  partner_satang: string;
  payout_status: string | null;
  payout_satang: string | null;
  bank_net_satang: string | null;
  transfer_fee_satang: string | null;
  charge_reference: string | null;
  transfer_reference: string | null;
  withdrawal_id: string | null;
  withdrawable: boolean;
  refund_pending: boolean;
  recipient_ready: boolean;
  paid_at: Date | null;
  livemode: boolean | null;
};
export type FinanceSummary = {
  paid: string;
  refunded: string;
  company: string;
  partner: string;
  deposit: string;
  transferred: string | null;
  available: string;
  requested: string;
  awaiting: string;
  count: number;
};

export async function commissionPolicy() {
  const [policy] = await getDb()<{ commission_bps: number }[]>`
    select commission_bps from rbc_go.business_settings where id=true`;
  if (!policy) throw new BookingError("commission_unconfigured");
  return policy;
}

export async function setCommissionPolicy(accountId: string, percent: string) {
  await requireStaff(accountId, true);
  const bps = commissionFromPercent(percent);
  if (bps === null) throw new BookingError("invalid_commission");
  await getDb().begin(async (tx) => {
    const [old] = await tx<
      { commission_bps: number }[]
    >`select commission_bps from rbc_go.business_settings where id=true for update`;
    if (!old) throw new BookingError("commission_unconfigured");
    if (old.commission_bps === bps) return;
    await tx`update rbc_go.business_settings set commission_bps=${bps},updated_by=${accountId},updated_at=now() where id=true`;
    await tx`insert into rbc_go.commission_policy_changes(previous_bps,commission_bps,changed_by) values(${old.commission_bps},${bps},${accountId})`;
  });
}

export async function requestPartnerWithdrawal(
  accountId: string,
  bookingId: string,
) {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId))
    throw new BookingError("invalid_request");
  const partner = await getActivePartner(accountId);
  if (!partner) throw new BookingError("access_denied");
  const sql = getDb();
  return sql.begin(async (tx) => {
    // Share the booking lock with refunds and payout creation; never trust a client amount.
    const [owned] =
      await tx`select b.id from rbc_go.bookings b join rbc_go.listings l on l.id=b.listing_id
      join rbc_go.partner_members m on m.partner_id=l.partner_id
      where b.id=${bookingId} and l.partner_id=${partner.id} and m.account_id=${accountId} and m.role='owner' for update of b`;
    if (!owned) throw new BookingError("access_denied");
    const [balance] = await tx<
      { partner_satang: string; withdrawable: boolean }[]
    >`
      select partner_satang::text,withdrawable from rbc_go.booking_financials where id=${bookingId}`;
    if (!balance?.withdrawable)
      throw new BookingError("withdrawal_unavailable");
    const [request] =
      await tx`insert into rbc_go.partner_withdrawal_requests(booking_id,partner_id,amount_satang,requested_by)
      values(${bookingId},${partner.id},${balance.partner_satang},${accountId}) on conflict(booking_id) do nothing returning id`;
    if (!request) throw new BookingError("withdrawal_unavailable");
    return request.id as string;
  });
}

type Filters = {
  period?: unknown;
  q?: string;
  partnerId?: string;
  mode?: string;
  page?: string;
};
async function readFinancials(filters: Filters, partnerId?: string) {
  const sql = getDb();
  const { period, from } = financePeriod(filters.period);
  const mode =
    filters.mode === "live"
      ? "live"
      : filters.mode === "test"
        ? "test"
        : (omiseMode() ?? "live");
  const q = (filters.q ?? "").trim().slice(0, 120);
  const selectedPartner =
    partnerId ??
    (/^[0-9a-f-]{36}$/i.test(filters.partnerId ?? "")
      ? filters.partnerId!
      : null);
  const page = Math.max(
    1,
    Math.min(100000, Number.parseInt(filters.page ?? "1", 10) || 1),
  );
  const where = sql`f.paid_satang>0 and f.paid_at>=${from} and f.livemode=${mode === "live"}
    and (${selectedPartner}::uuid is null or f.partner_id=${selectedPartner}::uuid)
    and (${q}='' or strpos(lower(f.business_name),lower(${q}))>0 or strpos(lower(f.title),lower(${q}))>0 or strpos(f.id::text,lower(${q}))>0)`;
  const [rows, summary, companies] = await Promise.all([
    sql<
      FinancialBooking[]
    >`select f.id,f.title,f.business_name,f.partner_id,f.status,
      f.paid_satang::text,f.refunded_satang::text,f.rental_satang::text,f.deposit_held_satang::text,
      f.commission_bps,f.company_satang::text,f.partner_satang::text,f.payout_status,
      f.payout_satang::text,f.bank_net_satang::text,f.transfer_fee_satang::text,
      f.charge_reference,f.transfer_reference,f.withdrawal_id,f.withdrawable,f.refund_pending,f.recipient_ready,f.paid_at,f.livemode
      from rbc_go.booking_financials f where ${where} order by f.paid_at desc,f.id limit 20 offset ${(page - 1) * 20}`,
    sql<FinanceSummary[]>`select count(*)::integer as count,
      coalesce(sum(f.paid_satang),0)::text as paid,coalesce(sum(f.refunded_satang),0)::text as refunded,
      coalesce(sum(f.company_satang),0)::text as company,coalesce(sum(f.partner_satang),0)::text as partner,
      coalesce(sum(f.deposit_held_satang),0)::text as deposit,
      case when count(*) filter(where f.payout_status='paid' and f.bank_net_satang is null)>0 then null else coalesce(sum(f.bank_net_satang) filter(where f.payout_status='paid'),0)::text end as transferred,
      coalesce(sum(f.partner_satang) filter(where f.withdrawable),0)::text as available,
      coalesce(sum(f.partner_satang) filter(where f.withdrawal_id is not null and (f.payout_status is null or f.payout_status<>'paid')),0)::text as requested,
      coalesce(sum(f.partner_satang) filter(where f.payout_status is null or f.payout_status<>'paid'),0)::text as awaiting
      from rbc_go.booking_financials f where ${where}`,
    sql<
      {
        partner_id: string;
        business_name: string;
        paid: string;
        company: string;
        partner: string;
        count: number;
      }[]
    >`
      select f.partner_id,f.business_name,count(*)::integer as count,sum(f.paid_satang)::text as paid,
      sum(f.company_satang)::text as company,sum(f.partner_satang)::text as partner
      from rbc_go.booking_financials f where ${where} group by f.partner_id,f.business_name order by sum(f.paid_satang) desc limit 50`,
  ]);
  return {
    rows,
    summary: summary[0],
    companies,
    period,
    mode,
    q,
    page,
    partnerId: selectedPartner,
  };
}

export async function staffFinancials(
  accountId: string,
  filters: Filters = {},
) {
  await requireStaff(accountId);
  return readFinancials(filters);
}
export async function partnerFinancials(
  accountId: string,
  filters: Filters = {},
) {
  const partner = await getActivePartner(accountId);
  if (!partner) throw new BookingError("access_denied");
  return readFinancials(
    { ...filters, period: filters.period ?? "all" },
    partner.id,
  );
}

export async function partnerCounts(accountId: string) {
  await requireStaff(accountId);
  const [counts] = await getDb()<
    { total: number; active: number; suspended: number; pending: number }[]
  >`
    select count(*)::integer as total,count(*) filter(where status='active')::integer as active,
    count(*) filter(where status='suspended')::integer as suspended,
    (select count(*)::integer from rbc_go.partner_applications where status in ('submitted','under_review')) as pending
    from rbc_go.partners`;
  return counts;
}
