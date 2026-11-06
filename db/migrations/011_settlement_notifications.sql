begin;
create function rbc_go.notify_settlement_change() returns trigger language plpgsql as $$
begin
  if TG_OP='UPDATE' and new.status=old.status then return new; end if;
  if TG_TABLE_NAME='refund_requests' then
    insert into rbc_go.email_outbox(booking_id,dedupe_key,recipient,subject,body,relative_path)
    select new.booking_id,'refund:'||new.id::text||':'||new.status||':'||accounts.id::text,
      accounts.email,'RBC GO refund: '||new.status,'Your refund request has been updated. Sign in to review its status.',
      '/th/partner-bookings/'||new.booking_id::text
    from rbc_go.bookings bookings join rbc_go.accounts accounts on accounts.id=bookings.customer_account_id
    where bookings.id=new.booking_id and accounts.email is not null on conflict do nothing;
    if new.status='requested' then
      insert into rbc_go.email_outbox(booking_id,dedupe_key,recipient,subject,body,relative_path)
      select new.booking_id,'refund-review:'||new.id::text||':'||accounts.id::text,accounts.email,'RBC GO: Refund review requested',
        'A customer refund needs review. Sign in to the operations workspace.','/th/operations/payments'
      from rbc_go.staff_members staff join rbc_go.accounts accounts on accounts.id=staff.account_id
      where staff.role='admin' and accounts.email is not null on conflict do nothing;
    end if;
  else
    insert into rbc_go.email_outbox(booking_id,dedupe_key,recipient,subject,body,relative_path)
    select new.booking_id,'payout:'||new.id::text||':'||new.status||':'||accounts.id::text,
      accounts.email,'RBC GO payout: '||new.status,'Your payout status has changed. Sign in to review the amount and gateway fees.',
      '/th/partner/earnings'
    from rbc_go.partner_members members join rbc_go.accounts accounts on accounts.id=members.account_id
    where members.partner_id=new.partner_id and accounts.email is not null on conflict do nothing;
  end if;
  return new;
end $$;
create trigger refunds_email_notification after insert or update of status on rbc_go.refund_requests
  for each row execute function rbc_go.notify_settlement_change();
create trigger payouts_email_notification after insert or update of status on rbc_go.payouts
  for each row execute function rbc_go.notify_settlement_change();
insert into rbc_go.schema_migrations(version) values(11);
commit;
