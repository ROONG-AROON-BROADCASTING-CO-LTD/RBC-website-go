begin;

create table rbc_go.email_signin_challenges (
  token_hash bytea primary key check (octet_length(token_hash) = 32),
  email text not null,
  display_name text not null,
  code_hash bytea not null check (octet_length(code_hash) = 32),
  attempts smallint not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index email_signin_challenges_email_idx
  on rbc_go.email_signin_challenges (email, created_at);
create index email_signin_challenges_created_idx
  on rbc_go.email_signin_challenges (created_at);

insert into rbc_go.schema_migrations (version) values (12);
commit;
