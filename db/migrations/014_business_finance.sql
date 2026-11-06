begin;

create table rbc_go.business_settings (
  id boolean primary key default true check(id),
  commission_bps integer not null default 1000 check(commission_bps between 0 and 10000),
  updated_by uuid references rbc_go.accounts(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into rbc_go.business_settings(id) values(true);
create table rbc_go.commission_policy_changes (
  id bigint generated always as identity primary key,
  previous_bps integer not null,
  commission_bps integer not null check(commission_bps between 0 and 10000),
  changed_by uuid references rbc_go.accounts(id) on delete set null,
  changed_at timestamptz not null default now()
);

-- Existing payouts retain their agreed rate. Other existing bookings start at 10%.
alter table rbc_go.bookings add column commission_bps integer not null default 1000
  check(commission_bps between 0 and 10000);
update rbc_go.bookings b set commission_bps=p.commission_bps
  from rbc_go.payouts p where p.booking_id=b.id;
alter table rbc_go.payment_attempts add column captured_at timestamptz;
alter table rbc_go.payment_attempts add column livemode boolean;
update rbc_go.payment_attempts set captured_at=updated_at,
  livemode=case when provider_reference like 'chrg_test_%' then false
    when provider_reference like 'chrg_%' then true else null end
  where status in ('succeeded','refunded');

create table rbc_go.partner_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references rbc_go.bookings(id) on delete cascade,
  partner_id uuid not null references rbc_go.partners(id),
  amount_satang bigint not null check(amount_satang>0),
  requested_by uuid not null references rbc_go.accounts(id),
  created_at timestamptz not null default now()
);
create index withdrawal_requests_partner_idx on rbc_go.partner_withdrawal_requests(partner_id,created_at desc);
create index withdrawal_requests_requester_idx on rbc_go.partner_withdrawal_requests(requested_by);

-- One row per booking, shared by staff reports, partner balances and withdrawals.
-- Aggregate attempts and refunds separately to avoid multiplying money in joins.
create view rbc_go.booking_financials as
with payments as (
  select booking_id,sum(amount_satang)::bigint as paid_satang,min(captured_at) as paid_at,
    bool_or(livemode) as livemode,
    string_agg(provider_reference,', ' order by created_at) as charge_reference
  from rbc_go.payment_attempts where status in ('succeeded','refunded') group by booking_id
), refunds as (
  select booking_id,
    coalesce(sum(amount_satang) filter(where status='succeeded'),0)::bigint as refunded_satang,
    coalesce(sum(amount_satang) filter(where status='succeeded' and kind='deposit'),0)::bigint as deposit_refunded_satang,
    bool_or(status in ('requested','processing')) as refund_pending
  from rbc_go.refund_requests group by booking_id
), amounts as (
  select b.id,b.listing_id,b.customer_account_id,b.status,b.total_satang,b.deposit_satang,
    b.commission_bps,b.created_at,b.ends_at,l.partner_id,l.title,p.business_name,p.status as partner_status,
    coalesce(pay.paid_satang,0) as paid_satang,pay.paid_at,pay.livemode,pay.charge_reference,
    coalesce(r.refunded_satang,0) as refunded_satang,
    coalesce(r.deposit_refunded_satang,0) as deposit_refunded_satang,
    coalesce(r.refund_pending,false) as refund_pending,
    greatest(0,least(b.total_satang,coalesce(pay.paid_satang,0))-b.deposit_satang-
      greatest(0,coalesce(r.refunded_satang,0)-coalesce(r.deposit_refunded_satang,0))) as rental_satang,
    greatest(0,least(b.deposit_satang-coalesce(r.deposit_refunded_satang,0),
      coalesce(pay.paid_satang,0)-coalesce(r.refunded_satang,0))) as deposit_held_satang
  from rbc_go.bookings b join rbc_go.listings l on l.id=b.listing_id
  join rbc_go.partners p on p.id=l.partner_id
  left join payments pay on pay.booking_id=b.id left join refunds r on r.booking_id=b.id
), shares as (
  select a.*,floor(a.rental_satang::numeric*a.commission_bps/10000)::bigint as company_satang
  from amounts a
)
select s.*,s.rental_satang-s.company_satang as partner_satang,
  po.id as payout_id,po.status as payout_status,po.amount_satang as payout_satang,
  po.net_satang as bank_net_satang,po.fee_satang as transfer_fee_satang,
  po.provider_reference as transfer_reference,
  w.id as withdrawal_id,w.created_at as withdrawal_requested_at,
  (pa.partner_id is not null and pa.livemode=s.livemode) as recipient_ready,
  (s.status='completed' and s.partner_status='active' and s.paid_satang>0
    and s.deposit_refunded_satang>=s.deposit_satang and not s.refund_pending
    and s.rental_satang-s.company_satang>0 and pa.partner_id is not null
    and pa.livemode=s.livemode and po.id is null and w.id is null) as withdrawable
from shares s left join rbc_go.payouts po on po.booking_id=s.id
left join rbc_go.partner_withdrawal_requests w on w.booking_id=s.id
left join rbc_go.partner_payout_accounts pa on pa.partner_id=s.partner_id;

insert into rbc_go.schema_migrations(version) values(14);
commit;
