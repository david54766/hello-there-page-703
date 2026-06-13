create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
begin
  insert into public.businesses (
    owner_id,
    business_name,
    website,
    subscription_status,
    trial_call_seconds_limit
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'business_name', 'My Business'),
    nullif(new.raw_user_meta_data->>'website', ''),
    'trialing',
    900
  )
  returning id into new_business_id;

  insert into public.business_members (business_id, user_id)
  values (new_business_id, new.id);

  insert into public.user_roles (user_id, business_id, role)
  values (new.id, new_business_id, 'admin');

  return new;
end;
$$;
