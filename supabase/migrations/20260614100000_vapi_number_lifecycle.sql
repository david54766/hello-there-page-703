alter table public.vapi_number_assistants
  add column if not exists number_provider text not null default 'vapi',
  add column if not exists number_status text not null default 'active',
  add column if not exists provisioned_at timestamptz not null default now(),
  add column if not exists reclaim_after timestamptz,
  add column if not exists quarantine_until timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists release_reason text,
  add column if not exists released_by uuid references auth.users(id) on delete set null,
  add column if not exists call_count_at_reclaim integer not null default 0,
  add column if not exists last_reclaim_checked_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vapi_number_assistants_number_status_check'
  ) then
    alter table public.vapi_number_assistants
      add constraint vapi_number_assistants_number_status_check
      check (number_status in ('active', 'reclaim_pending', 'quarantined', 'released'));
  end if;
end $$;

create index if not exists idx_vapi_number_assistants_lifecycle
on public.vapi_number_assistants (number_status, reclaim_after, quarantine_until);

create index if not exists idx_vapi_number_assistants_business_status
on public.vapi_number_assistants (business_id, number_status);
