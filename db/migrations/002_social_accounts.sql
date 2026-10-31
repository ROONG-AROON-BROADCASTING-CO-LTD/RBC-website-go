-- Social identities can have no email or phone when the provider does not return one.
-- Access is granted only through a verified provider identity and a server session.
begin;

alter table rbc_go.accounts drop constraint accounts_contact_required;

insert into rbc_go.schema_migrations (version) values (2);

commit;
