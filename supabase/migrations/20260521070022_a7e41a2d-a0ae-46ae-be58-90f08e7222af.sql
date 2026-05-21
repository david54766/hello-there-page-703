
-- Enums
CREATE TYPE public.dispatch_role AS ENUM ('emergency', 'office', 'sales');
CREATE TYPE public.appointment_provider AS ENUM ('hcp', 'jobber', 'internal');
CREATE TYPE public.appointment_status AS ENUM ('booked', 'completed', 'cancelled');
CREATE TYPE public.assignment_status AS ENUM ('pending', 'accepted', 'completed', 'reassigned');

-- Add 'emergency' to existing notification_kind enum
ALTER TYPE public.notification_kind ADD VALUE IF NOT EXISTS 'emergency';

-- team_members
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid,
  name text NOT NULL,
  phone text,
  email text,
  role public.dispatch_role NOT NULL DEFAULT 'office',
  active boolean NOT NULL DEFAULT true,
  last_assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read team" ON public.team_members FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "members write team" ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "members update team" ON public.team_members FOR UPDATE TO authenticated
  USING (public.is_business_member(auth.uid(), business_id))
  WITH CHECK (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "admins delete team" ON public.team_members FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), business_id, 'admin'::app_role));
CREATE TRIGGER team_members_updated_at BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_team_members_business_role ON public.team_members(business_id, role, active);

-- lead_assignments
CREATE TABLE public.lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  call_id uuid NOT NULL,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  status public.assignment_status NOT NULL DEFAULT 'pending',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read assignments" ON public.lead_assignments FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "members write assignments" ON public.lead_assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "members update assignments" ON public.lead_assignments FOR UPDATE TO authenticated
  USING (public.is_business_member(auth.uid(), business_id))
  WITH CHECK (public.is_business_member(auth.uid(), business_id));
CREATE TRIGGER lead_assignments_updated_at BEFORE UPDATE ON public.lead_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_lead_assignments_call ON public.lead_assignments(call_id);
CREATE INDEX idx_lead_assignments_business ON public.lead_assignments(business_id, status);

-- appointments
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  call_id uuid,
  provider public.appointment_provider NOT NULL DEFAULT 'internal',
  provider_ref text,
  scheduled_for timestamptz NOT NULL,
  customer_name text,
  customer_phone text,
  service text,
  status public.appointment_status NOT NULL DEFAULT 'booked',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read appts" ON public.appointments FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "members write appts" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "members update appts" ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_business_member(auth.uid(), business_id))
  WITH CHECK (public.is_business_member(auth.uid(), business_id));
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_appointments_business_time ON public.appointments(business_id, scheduled_for);

-- Add scheduling provider preference + agent voice on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS scheduling_provider public.appointment_provider DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS hcp_api_key text,
  ADD COLUMN IF NOT EXISTS jobber_refresh_token text,
  ADD COLUMN IF NOT EXISTS agent_voice_id text,
  ADD COLUMN IF NOT EXISTS agent_prompt_override text;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
