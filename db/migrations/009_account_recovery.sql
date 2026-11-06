begin;
create table rbc_go.account_tokens (
  token_hash bytea primary key check(octet_length(token_hash)=32),
  account_id uuid not null references rbc_go.accounts(id) on delete cascade,
  email text not null,
  purpose text not null check(purpose in ('verify','reset')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index account_tokens_account_idx on rbc_go.account_tokens(account_id,purpose,created_at);
create table rbc_go.phone_challenges (
  token_hash bytea primary key check(octet_length(token_hash)=32),
  phone_e164 text not null check(phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  display_name text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index phone_challenges_phone_idx on rbc_go.phone_challenges(phone_e164,created_at);
insert into rbc_go.schema_migrations(version) values(9);
commit;
