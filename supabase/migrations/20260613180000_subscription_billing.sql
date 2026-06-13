create table if not exists public.subscription_plans (
  code text primary key,
  name text not null,
  description text,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  included_call_minutes integer not null default 0 check (included_call_minutes >= 0),
  included_sms_segments integer not null default 0 check (included_sms_segments >= 0),
  estimated_ai_minutes integer not null default 0 check (estimated_ai_minutes >= 0),
  estimated_sms_segments integer not null default 0 check (estimated_sms_segments >= 0),
  cost_per_ai_minute_cents numeric(8, 3) not null default 8.5 check (cost_per_ai_minute_cents >= 0),
  cost_per_sms_segment_cents numeric(8, 3) not null default 1.2 check (cost_per_sms_segment_cents >= 0),
  phone_number_monthly_cents integer not null default 115 check (phone_number_monthly_cents >= 0),
  platform_buffer_cents integer not null default 1000 check (platform_buffer_cents >= 0),
  overage_call_minute_cents integer not null default 15 check (overage_call_minute_cents >= 0),
  overage_sms_segment_cents integer not null default 2 check (overage_sms_segment_cents >= 0),
  stripe_price_id text,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.billing_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  percent_off integer check (percent_off is null or (percent_off > 0 and percent_off <= 100)),
  amount_off_cents integer check (amount_off_cents is null or amount_off_cents > 0),
  duration_months integer check (duration_months is null or duration_months > 0),
  stripe_coupon_id text,
  active boolean not null default true,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint billing_coupons_discount_check check (
    (percent_off is not null and amount_off_cents is null)
    or (percent_off is null and amount_off_cents is not null)
  )
);

alter table public.businesses
  add column if not exists subscription_plan_code text references public.subscription_plans(code),
  add column if not exists subscription_status text not null default 'trialing',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists subscription_current_period_end timestamp with time zone;

create index if not exists idx_businesses_subscription_plan_code
on public.businesses(subscription_plan_code);

alter table public.subscription_plans enable row level security;
alter table public.billing_coupons enable row level security;

grant select on table public.subscription_plans to anon, authenticated;
grant select on table public.billing_coupons to authenticated;
grant select, insert, update, delete on table public.subscription_plans to service_role;
grant select, insert, update, delete on table public.billing_coupons to service_role;

drop policy if exists "Active subscription plans are public" on public.subscription_plans;
drop policy if exists "Platform admins can read billing coupons" on public.billing_coupons;

create policy "Active subscription plans are public"
on public.subscription_plans
for select
to anon, authenticated
using (active = true);

create policy "Platform admins can read billing coupons"
on public.billing_coupons
for select
to authenticated
using (
  exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

insert into public.subscription_plans (
  code,
  name,
  description,
  monthly_price_cents,
  included_call_minutes,
  included_sms_segments,
  estimated_ai_minutes,
  estimated_sms_segments,
  platform_buffer_cents,
  features,
  sort_order
) values
  (
    'starter',
    'Starter',
    'For one busy contractor line that needs missed-call recovery.',
    7900,
    150,
    400,
    150,
    400,
    1000,
    '["AI missed-call answering", "SMS double opt-in", "Lead inbox and transcripts", "One Vapi phone number"]'::jsonb,
    10
  ),
  (
    'pro',
    'Pro',
    'For growing shops with more call volume and dispatch routing.',
    14900,
    400,
    1000,
    400,
    1000,
    1500,
    '["Everything in Starter", "Team routing", "Booking tools", "Priority lead alerts", "Website setup scan"]'::jsonb,
    20
  ),
  (
    'scale',
    'Scale',
    'For high-volume teams that want more automation headroom.',
    29900,
    900,
    2500,
    900,
    2500,
    2500,
    '["Everything in Pro", "Higher usage allowance", "Advanced reporting", "Multi-user operations", "Priority support"]'::jsonb,
    30
  )
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  included_call_minutes = excluded.included_call_minutes,
  included_sms_segments = excluded.included_sms_segments,
  estimated_ai_minutes = excluded.estimated_ai_minutes,
  estimated_sms_segments = excluded.estimated_sms_segments,
  platform_buffer_cents = excluded.platform_buffer_cents,
  features = excluded.features,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.billing_coupons (
  code,
  name,
  percent_off,
  duration_months,
  active,
  max_redemptions
) values (
  'LAUNCH20',
  'Launch 20% off',
  20,
  3,
  false,
  null
)
on conflict (code) do nothing;
