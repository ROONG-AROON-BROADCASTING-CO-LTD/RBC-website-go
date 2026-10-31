begin;

create table rbc_go.partner_email_challenges (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  code_hash bytea not null check (octet_length(code_hash) = 32),
  expires_at timestamptz not null,
  resend_after timestamptz not null,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  send_count smallint not null default 1 check (send_count between 1 and 5),
  window_started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index partner_email_challenges_expiry_idx
  on rbc_go.partner_email_challenges (expires_at);

insert into rbc_go.schema_migrations (version) values (4);

commit;
