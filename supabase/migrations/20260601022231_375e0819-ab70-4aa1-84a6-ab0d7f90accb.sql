
-- 1. businesses: tag defaults + scheduling toggle + booking links
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS website_blurb text,
  ADD COLUMN IF NOT EXISTS booking_url text,
  ADD COLUMN IF NOT EXISTS callback_form_url text,
  ADD COLUMN IF NOT EXISTS sms_consent_text text,
  ADD COLUMN IF NOT EXISTS default_hello_script text,
  ADD COLUMN IF NOT EXISTS cal_url text,
  ADD COLUMN IF NOT EXISTS calendly_url text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS scheduling_enabled boolean NOT NULL DEFAULT false;

-- 2. vapi_number_assistants: per Vapi number assistant + overrides
CREATE TABLE IF NOT EXISTS public.vapi_number_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  phone_number_id text NOT NULL,
  phone_number text,
  assistant_id text,
  assistant_name text,
  contractor_type_preset text,
  custom_prompt text,
  custom_first_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, phone_number_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vapi_number_assistants TO authenticated;
GRANT ALL ON public.vapi_number_assistants TO service_role;
ALTER TABLE public.vapi_number_assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read vapi numbers" ON public.vapi_number_assistants FOR SELECT TO authenticated USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "members write vapi numbers" ON public.vapi_number_assistants FOR INSERT TO authenticated WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "members update vapi numbers" ON public.vapi_number_assistants FOR UPDATE TO authenticated USING (is_business_member(auth.uid(), business_id)) WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "members delete vapi numbers" ON public.vapi_number_assistants FOR DELETE TO authenticated USING (is_business_member(auth.uid(), business_id));
CREATE TRIGGER touch_vapi_number_assistants BEFORE UPDATE ON public.vapi_number_assistants FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. script_templates: user-editable script library per contractor type
CREATE TABLE IF NOT EXISTS public.script_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  contractor_type text,
  kind text NOT NULL CHECK (kind IN ('hello','system','first_message')),
  label text NOT NULL,
  body text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_templates TO authenticated;
GRANT ALL ON public.script_templates TO service_role;
ALTER TABLE public.script_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read scripts" ON public.script_templates FOR SELECT TO authenticated USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "members write scripts" ON public.script_templates FOR INSERT TO authenticated WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "members update scripts" ON public.script_templates FOR UPDATE TO authenticated USING (is_business_member(auth.uid(), business_id)) WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "members delete scripts" ON public.script_templates FOR DELETE TO authenticated USING (is_business_member(auth.uid(), business_id));
CREATE TRIGGER touch_script_templates BEFORE UPDATE ON public.script_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. schedule_blackouts
CREATE TABLE IF NOT EXISTS public.schedule_blackouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  team_member_id uuid,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_blackouts TO authenticated;
GRANT ALL ON public.schedule_blackouts TO service_role;
ALTER TABLE public.schedule_blackouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read blackouts" ON public.schedule_blackouts FOR SELECT TO authenticated USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "members write blackouts" ON public.schedule_blackouts FOR INSERT TO authenticated WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "members update blackouts" ON public.schedule_blackouts FOR UPDATE TO authenticated USING (is_business_member(auth.uid(), business_id)) WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "members delete blackouts" ON public.schedule_blackouts FOR DELETE TO authenticated USING (is_business_member(auth.uid(), business_id));

-- 5. calendar_connections (per team member OAuth)
CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  team_member_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('google','outlook')),
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  calendar_id text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_member_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_connections TO authenticated;
GRANT ALL ON public.calendar_connections TO service_role;
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read cal conns" ON public.calendar_connections FOR SELECT TO authenticated USING (is_business_member(auth.uid(), business_id));
CREATE POLICY "members write cal conns" ON public.calendar_connections FOR INSERT TO authenticated WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "members update cal conns" ON public.calendar_connections FOR UPDATE TO authenticated USING (is_business_member(auth.uid(), business_id)) WITH CHECK (is_business_member(auth.uid(), business_id));
CREATE POLICY "members delete cal conns" ON public.calendar_connections FOR DELETE TO authenticated USING (is_business_member(auth.uid(), business_id));
CREATE TRIGGER touch_calendar_connections BEFORE UPDATE ON public.calendar_connections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. appointments: agent + source + external
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS team_member_id uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_event_id text,
  ADD COLUMN IF NOT EXISTS external_provider text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS notes text;

-- 7. team_members: weekly availability
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS availability jsonb NOT NULL DEFAULT '{"mon":["09:00","17:00"],"tue":["09:00","17:00"],"wed":["09:00","17:00"],"thu":["09:00","17:00"],"fri":["09:00","17:00"],"sat":null,"sun":null}'::jsonb,
  ADD COLUMN IF NOT EXISTS color text;
