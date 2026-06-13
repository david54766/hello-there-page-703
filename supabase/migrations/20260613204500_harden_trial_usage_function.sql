create or replace function public.business_trial_call_seconds(_business_id uuid)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(duration_seconds), 0)::integer
  from public.calls
  where business_id = _business_id;
$$;

revoke execute on function public.business_trial_call_seconds(uuid) from public, anon;
grant execute on function public.business_trial_call_seconds(uuid) to authenticated, service_role;
