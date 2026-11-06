begin;
alter table rbc_go.bookings add column handed_over_at timestamptz;
alter table rbc_go.bookings add column completed_at timestamptz;

create table rbc_go.saved_listings (
  account_id uuid not null references rbc_go.accounts(id) on delete cascade,
  listing_id uuid not null references rbc_go.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(account_id, listing_id)
);
create index saved_listings_listing_idx on rbc_go.saved_listings(listing_id);
create table rbc_go.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references rbc_go.bookings(id) on delete cascade,
  sender_account_id uuid not null references rbc_go.accounts(id),
  body text not null check(char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index booking_messages_booking_idx on rbc_go.booking_messages(booking_id, created_at);
create index booking_messages_sender_idx on rbc_go.booking_messages(sender_account_id, created_at);
create table rbc_go.booking_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references rbc_go.bookings(id) on delete cascade,
  author_account_id uuid not null references rbc_go.accounts(id),
  rating smallint not null check(rating between 1 and 5),
  body text not null check(char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index booking_reviews_author_idx on rbc_go.booking_reviews(author_account_id, created_at);
insert into rbc_go.schema_migrations(version) values(7);
commit;
