alter table public.businesses
  add column if not exists sms_auto_response_mode text not null default 'off';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_sms_auto_response_mode_check'
  ) then
    alter table public.businesses
      add constraint businesses_sms_auto_response_mode_check
      check (sms_auto_response_mode in ('off', 'call', 'website', 'both'));
  end if;
end $$;
