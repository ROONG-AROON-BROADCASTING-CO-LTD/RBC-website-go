begin;

-- Empty arrays keep existing applications and older deployments compatible.
-- New submissions require at least one category in the server validation.
alter table rbc_go.partner_applications
  add column rental_categories text[] not null default '{}'::text[]
  constraint partner_applications_rental_categories_check check (
    cardinality(rental_categories) <= 4
    and rental_categories <@ array['cars', 'motorcycles', 'boats', 'jets']::text[]
    and array_position(rental_categories, null) is null
  );

insert into rbc_go.schema_migrations (version) values (13);
commit;
