alter table public.calls
  add column if not exists duration_seconds integer not null default 0 check (duration_seconds >= 0);

alter table public.businesses
  add column if not exists trial_call_seconds_limit integer not null default 900 check (trial_call_seconds_limit >= 0);

create index if not exists idx_calls_business_duration
on public.calls (business_id, duration_seconds)
where duration_seconds > 0;

create or replace function public.business_trial_call_seconds(_business_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(duration_seconds), 0)::integer
  from public.calls
  where business_id = _business_id;
$$;

grant execute on function public.business_trial_call_seconds(uuid) to authenticated, service_role;
