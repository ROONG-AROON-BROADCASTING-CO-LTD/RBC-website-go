begin;

alter table rbc_go.bookings drop constraint bookings_status_check;
alter table rbc_go.bookings add constraint bookings_status_check
  check (status in ('requested', 'held', 'confirmed', 'completed', 'declined', 'cancelled', 'expired'));
create index bookings_requests_idx on rbc_go.bookings (listing_id, created_at desc)
  where status = 'requested';

insert into rbc_go.schema_migrations (version) values (5);
commit;
