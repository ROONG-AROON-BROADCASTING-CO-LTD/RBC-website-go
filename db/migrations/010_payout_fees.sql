begin;
alter table rbc_go.payouts add column fee_satang bigint check(fee_satang >= 0);
alter table rbc_go.payouts add column net_satang bigint check(net_satang >= 0);
insert into rbc_go.schema_migrations(version) values(10);
commit;
