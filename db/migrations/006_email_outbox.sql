begin;

create table rbc_go.email_outbox (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references rbc_go.bookings(id) on delete cascade,
  dedupe_key text not null unique,
  recipient text not null,
  subject text not null,
  body text not null,
  relative_path text,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_until timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index email_outbox_pending_idx on rbc_go.email_outbox(available_at)
  where sent_at is null;

create function rbc_go.notify_booking_change() returns trigger language plpgsql as $$
declare
  recipient_email text;
  subject_line text;
begin
  if TG_OP = 'UPDATE' and new.status = old.status then return new; end if;
  subject_line := 'RBC GO booking ' || left(new.id::text, 8) || ': ' || new.status;
  select email into recipient_email from rbc_go.accounts where id = new.customer_account_id;
  if recipient_email is not null then
    insert into rbc_go.email_outbox(booking_id, dedupe_key, recipient, subject, body, relative_path)
    values(new.id, new.id::text || ':' || new.status || ':customer', recipient_email,
      subject_line, 'Your booking status has changed. Sign in to review the latest details.',
      '/th/partner-bookings/' || new.id::text)
    on conflict(dedupe_key) do nothing;
  end if;
  insert into rbc_go.email_outbox(booking_id, dedupe_key, recipient, subject, body, relative_path)
  select new.id, new.id::text || ':' || new.status || ':partner:' || accounts.id::text,
    accounts.email, subject_line, 'A booking for your vehicle has changed. Sign in to review it.', '/th/partner/overview'
  from rbc_go.listings listings
  join rbc_go.partner_members members on members.partner_id = listings.partner_id
  join rbc_go.accounts accounts on accounts.id = members.account_id
  where listings.id = new.listing_id and accounts.email is not null
  on conflict(dedupe_key) do nothing;
  return new;
end $$;

create trigger bookings_email_notification after insert or update of status on rbc_go.bookings
  for each row execute function rbc_go.notify_booking_change();

insert into rbc_go.schema_migrations(version) values(6);
commit;
