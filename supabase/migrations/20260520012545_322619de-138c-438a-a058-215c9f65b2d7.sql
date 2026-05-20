
-- =========================
-- Enums
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.contractor_type AS ENUM (
  'roofing','plumbing','hvac','electrical','landscaping','pest_control',
  'restoration','general_contractor','painting','concrete','pool_services',
  'pressure_washing','tree_services','flooring','handyman','solar','fencing'
);
CREATE TYPE public.carrier AS ENUM (
  'verizon','att','tmobile','comcast','ringcentral','google_voice','other'
);
CREATE TYPE public.call_urgency AS ENUM ('low','medium','high','emergency');
CREATE TYPE public.call_status AS ENUM ('new','contacted','resolved');

-- =========================
-- Businesses
-- =========================
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT 'My Business',
  contractor_type public.contractor_type,
  business_phone text,
  owner_phone text,
  carrier public.carrier,
  twilio_number text,
  business_hours jsonb NOT NULL DEFAULT '{"timezone":"America/New_York","weekday_start":"08:00","weekday_end":"18:00"}'::jsonb,
  avg_job_value integer NOT NULL DEFAULT 500,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================
-- Memberships (multi-tenant scope)
-- =========================
CREATE TABLE public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
CREATE INDEX ON public.business_members(user_id);
CREATE INDEX ON public.business_members(business_id);

-- =========================
-- Roles (separate table — anti privilege escalation)
-- =========================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id, role)
);
CREATE INDEX ON public.user_roles(user_id, business_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _business_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND business_id = _business_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE user_id = _user_id AND business_id = _business_id
  )
$$;

-- =========================
-- Calls
-- =========================
CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  caller_number text NOT NULL,
  caller_name text,
  recording_url text,
  transcript text,
  ai_summary text,
  service_needed text,
  urgency public.call_urgency NOT NULL DEFAULT 'medium',
  callback_requested boolean NOT NULL DEFAULT false,
  status public.call_status NOT NULL DEFAULT 'new',
  is_mobile boolean,
  twilio_call_sid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.calls(business_id, created_at DESC);

-- =========================
-- SMS threads + messages
-- =========================
CREATE TABLE public.sms_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  caller_number text NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, caller_number)
);

CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.sms_threads(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.sms_messages(thread_id, created_at);

-- =========================
-- Forwarding tests
-- =========================
CREATE TABLE public.forwarding_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  detected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.forwarding_tests(business_id, created_at DESC);

-- =========================
-- Auto-create business + admin role on signup
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_business_id uuid;
BEGIN
  INSERT INTO public.businesses (owner_id, business_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'))
  RETURNING id INTO new_business_id;

  INSERT INTO public.business_members (business_id, user_id)
  VALUES (new_business_id, NEW.id);

  INSERT INTO public.user_roles (user_id, business_id, role)
  VALUES (NEW.id, new_business_id, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER businesses_touch BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER calls_touch BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================
-- RLS
-- =========================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forwarding_tests ENABLE ROW LEVEL SECURITY;

-- businesses: members can read; admins can update
CREATE POLICY "members read businesses" ON public.businesses
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), id));

CREATE POLICY "admins update business" ON public.businesses
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), id, 'admin'))
  WITH CHECK (public.has_role(auth.uid(), id, 'admin'));

-- business_members: members can read their own membership rows
CREATE POLICY "members read memberships" ON public.business_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_business_member(auth.uid(), business_id));

CREATE POLICY "admins manage memberships" ON public.business_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), business_id, 'admin'))
  WITH CHECK (public.has_role(auth.uid(), business_id, 'admin'));

-- user_roles: members can read roles in their business
CREATE POLICY "members read roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_business_member(auth.uid(), business_id));

CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), business_id, 'admin'))
  WITH CHECK (public.has_role(auth.uid(), business_id, 'admin'));

-- calls
CREATE POLICY "members read calls" ON public.calls
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "members update calls" ON public.calls
  FOR UPDATE TO authenticated
  USING (public.is_business_member(auth.uid(), business_id))
  WITH CHECK (public.is_business_member(auth.uid(), business_id));

-- sms_threads
CREATE POLICY "members read threads" ON public.sms_threads
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

-- sms_messages
CREATE POLICY "members read messages" ON public.sms_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sms_threads t
    WHERE t.id = thread_id AND public.is_business_member(auth.uid(), t.business_id)
  ));

-- forwarding_tests
CREATE POLICY "members read tests" ON public.forwarding_tests
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

-- =========================
-- Realtime
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forwarding_tests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_messages;
