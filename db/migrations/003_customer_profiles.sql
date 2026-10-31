begin;

create table rbc_go.customer_profiles (
  account_id uuid primary key references rbc_go.accounts(id) on delete cascade,
  full_name text not null,
  contact_email text not null,
  contact_phone text not null,
  updated_at timestamptz not null default now(),
  constraint customer_profiles_name_length check (char_length(full_name) between 1 and 120),
  constraint customer_profiles_email_length check (char_length(contact_email) between 3 and 254),
  constraint customer_profiles_phone_length check (char_length(contact_phone) between 8 and 32)
);

insert into rbc_go.schema_migrations (version) values (3);

commit;
