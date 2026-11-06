-- RBC GO application data. Run once on PostgreSQL 14+ with ON_ERROR_STOP=1.
-- All application writes must use server-side authorization and transactions.
begin;

create schema if not exists rbc_go;
create extension if not exists btree_gist;

create table rbc_go.schema_migrations (
  version integer primary key,
  applied_at timestamptz not null default now()
);

create table rbc_go.accounts (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone_e164 text,
  display_name text not null,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_contact_required check (email is not null or phone_e164 is not null),
  constraint accounts_phone_format check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);
create unique index accounts_email_unique on rbc_go.accounts (lower(email)) where email is not null;
create unique index accounts_phone_unique on rbc_go.accounts (phone_e164) where phone_e164 is not null;

create table rbc_go.auth_identities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references rbc_go.accounts(id) on delete cascade,
  provider text not null check (provider in ('email', 'phone', 'google')),
  provider_subject text not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_subject)
);
create index auth_identities_account_idx on rbc_go.auth_identities (account_id);

create table rbc_go.account_credentials (
  account_id uuid primary key references rbc_go.accounts(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

create table rbc_go.user_sessions (
  token_hash bytea primary key check (octet_length(token_hash) = 32),
  account_id uuid not null references rbc_go.accounts(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint user_sessions_expiry check (expires_at > created_at)
);
create index user_sessions_account_idx on rbc_go.user_sessions (account_id);
create index user_sessions_expiry_idx on rbc_go.user_sessions (expires_at);

create table rbc_go.login_attempts (
  id bigint generated always as identity primary key,
  key_hash bytea not null check (octet_length(key_hash) = 32),
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);
create index login_attempts_key_time_idx on rbc_go.login_attempts (key_hash, attempted_at desc);

create table rbc_go.staff_members (
  account_id uuid primary key references rbc_go.accounts(id) on delete cascade,
  role text not null check (role in ('admin', 'reviewer', 'support')),
  created_at timestamptz not null default now()
);

create table rbc_go.partner_applications (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null unique references rbc_go.accounts(id),
  business_name text not null check (char_length(trim(business_name)) between 2 and 200),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected')),
  feedback text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references rbc_go.staff_members(account_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_applications_submitted_at check (status = 'draft' or submitted_at is not null)
);
create index partner_applications_status_idx on rbc_go.partner_applications (status, submitted_at);
create index partner_applications_reviewer_idx on rbc_go.partner_applications (reviewed_by);

-- Private document bytes are stored in PostgreSQL for the initial release.
-- The API must enforce authorization before reading or writing this table.
create table rbc_go.partner_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references rbc_go.partner_applications(id) on delete cascade,
  file_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  byte_size integer not null check (byte_size between 1 and 10485760),
  sha256 bytea not null check (octet_length(sha256) = 32),
  content bytea not null,
  uploaded_at timestamptz not null default now(),
  constraint partner_documents_size_matches check (octet_length(content) = byte_size)
);
create index partner_documents_application_idx on rbc_go.partner_documents (application_id);

create table rbc_go.partners (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references rbc_go.partner_applications(id),
  owner_account_id uuid not null references rbc_go.accounts(id),
  business_name text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);
create index partners_owner_idx on rbc_go.partners (owner_account_id);

create table rbc_go.partner_members (
  partner_id uuid not null references rbc_go.partners(id) on delete cascade,
  account_id uuid not null references rbc_go.accounts(id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (partner_id, account_id)
);
create index partner_members_account_idx on rbc_go.partner_members (account_id);

create table rbc_go.listings (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references rbc_go.partners(id),
  category text not null check (category in ('boats', 'motorcycles', 'cars', 'jets')),
  title text not null check (char_length(trim(title)) between 2 and 200),
  description text not null default '',
  location_text text not null,
  capacity integer not null check (capacity between 1 and 200),
  base_price_satang bigint not null check (base_price_satang >= 0),
  deposit_satang bigint not null default 0 check (deposit_satang >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'changes_requested', 'approved', 'suspended')),
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_partner_idx on rbc_go.listings (partner_id, status);
create index listings_public_idx on rbc_go.listings (category, created_at desc) where status = 'approved';

create table rbc_go.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references rbc_go.listings(id) on delete cascade,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 5242880),
  sha256 bytea not null check (octet_length(sha256) = 32),
  content bytea not null,
  alt_text text not null default '',
  position integer not null default 0 check (position >= 0),
  uploaded_at timestamptz not null default now(),
  constraint listing_images_size_matches check (octet_length(content) = byte_size)
);
create index listing_images_listing_idx on rbc_go.listing_images (listing_id, position);

create table rbc_go.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references rbc_go.listings(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  constraint availability_blocks_dates check (starts_at < ends_at)
);
create index availability_blocks_listing_period_idx
  on rbc_go.availability_blocks using gist (listing_id, tstzrange(starts_at, ends_at, '[)'));

create table rbc_go.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_account_id uuid not null references rbc_go.accounts(id),
  listing_id uuid not null references rbc_go.listings(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'held'
    check (status in ('held', 'confirmed', 'completed', 'cancelled', 'expired')),
  hold_expires_at timestamptz,
  total_satang bigint not null check (total_satang >= 0),
  deposit_satang bigint not null default 0 check (deposit_satang >= 0),
  currency char(3) not null default 'THB' check (currency = 'THB'),
  price_snapshot jsonb not null,
  traveler_snapshot jsonb not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_dates check (starts_at < ends_at),
  constraint bookings_hold_expiry check (status <> 'held' or hold_expires_at is not null),
  constraint bookings_no_overlap exclude using gist
    (listing_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
    where (status in ('held', 'confirmed'))
);
create index bookings_customer_idx on rbc_go.bookings (customer_account_id, created_at desc);
create index bookings_listing_idx on rbc_go.bookings (listing_id, starts_at);
create index bookings_expiring_holds_idx on rbc_go.bookings (hold_expires_at) where status = 'held';

create table rbc_go.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references rbc_go.bookings(id),
  provider text not null,
  provider_reference text,
  idempotency_key text not null unique,
  amount_satang bigint not null check (amount_satang > 0),
  currency char(3) not null default 'THB' check (currency = 'THB'),
  status text not null default 'created'
    check (status in ('created', 'pending', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payment_attempts_booking_idx on rbc_go.payment_attempts (booking_id);
create unique index payment_attempts_provider_ref_unique
  on rbc_go.payment_attempts (provider, provider_reference) where provider_reference is not null;

create table rbc_go.payment_events (
  provider text not null,
  provider_event_id text not null,
  payment_attempt_id uuid references rbc_go.payment_attempts(id),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null,
  primary key (provider, provider_event_id)
);
create index payment_events_attempt_idx on rbc_go.payment_events (payment_attempt_id);

insert into rbc_go.schema_migrations (version) values (1);

commit;
