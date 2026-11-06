begin;
create table rbc_go.refund_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references rbc_go.bookings(id) on delete cascade,
  payment_attempt_id uuid not null references rbc_go.payment_attempts(id) on delete cascade,
  kind text not null check(kind in ('cancellation','deposit')),
  reason text not null check(char_length(trim(reason)) between 1 and 1000),
  status text not null default 'requested' check(status in ('requested','processing','succeeded','declined','failed')),
  amount_satang bigint check(amount_satang > 0),
  provider_reference text unique,
  reviewed_by uuid references rbc_go.accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index refund_requests_active_idx on rbc_go.refund_requests(booking_id) where status in ('requested','processing');
create index refund_requests_payment_idx on rbc_go.refund_requests(payment_attempt_id);
create index refund_requests_reviewer_idx on rbc_go.refund_requests(reviewed_by);
create table rbc_go.partner_payout_accounts (
  partner_id uuid primary key references rbc_go.partners(id) on delete cascade,
  recipient_id text not null unique,
  livemode boolean not null,
  verified_by uuid not null references rbc_go.accounts(id),
  verified_at timestamptz not null default now()
);
create index partner_payout_accounts_verifier_idx on rbc_go.partner_payout_accounts(verified_by);
create table rbc_go.payouts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references rbc_go.bookings(id) on delete cascade,
  partner_id uuid not null references rbc_go.partners(id),
  recipient_id text not null,
  amount_satang bigint not null check(amount_satang > 0),
  commission_bps integer not null check(commission_bps between 0 and 10000),
  status text not null default 'processing' check(status in ('processing','pending','paid','failed')),
  provider_reference text unique,
  initiated_by uuid not null references rbc_go.accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payouts_partner_idx on rbc_go.payouts(partner_id, created_at desc);
create index payouts_initiator_idx on rbc_go.payouts(initiated_by);
insert into rbc_go.schema_migrations(version) values(8);
commit;
