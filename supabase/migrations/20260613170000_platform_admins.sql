create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.platform_admins enable row level security;

grant select on table public.platform_admins to authenticated;
grant select, insert, update, delete on table public.platform_admins to service_role;

drop policy if exists "Platform admins can read own record" on public.platform_admins;

create policy "Platform admins can read own record"
on public.platform_admins
for select
to authenticated
using ((select auth.uid()) = user_id);
