-- Team member login mode: invited users can access only their assigned work.

CREATE TABLE IF NOT EXISTS public.team_member_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'agent',
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_member_invites_business
  ON public.team_member_invites (business_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_member_invites_team_member
  ON public.team_member_invites (team_member_id, status);

DROP TRIGGER IF EXISTS touch_team_member_invites ON public.team_member_invites;
CREATE TRIGGER touch_team_member_invites
  BEFORE UPDATE ON public.team_member_invites
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.team_member_invites ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_member_invites TO authenticated;

CREATE OR REPLACE FUNCTION public.has_any_role(
  _user_id uuid,
  _business_id uuid,
  _roles public.app_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND business_id = _business_id
      AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_business_operator(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role(_user_id, _business_id, ARRAY['admin','staff']::public.app_role[])
$$;

CREATE OR REPLACE FUNCTION public.is_team_member_user(
  _user_id uuid,
  _business_id uuid,
  _team_member_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.id = _team_member_id
      AND tm.business_id = _business_id
      AND tm.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_call_assigned_to_user(_user_id uuid, _call_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lead_assignments la
    JOIN public.team_members tm ON tm.id = la.team_member_id
    WHERE la.call_id = _call_id
      AND tm.user_id = _user_id
      AND la.status <> 'reassigned'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_call(
  _user_id uuid,
  _business_id uuid,
  _call_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_business_operator(_user_id, _business_id)
    OR public.is_call_assigned_to_user(_user_id, _call_id)
$$;

CREATE OR REPLACE FUNCTION public.can_access_sms_thread(_user_id uuid, _thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sms_threads st
    WHERE st.id = _thread_id
      AND (
        public.is_business_operator(_user_id, st.business_id)
        OR EXISTS (
          SELECT 1
          FROM public.calls c
          WHERE c.business_id = st.business_id
            AND c.caller_number = st.caller_number
            AND public.is_call_assigned_to_user(_user_id, c.id)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_notification(
  _user_id uuid,
  _business_id uuid,
  _call_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_business_operator(_user_id, _business_id)
    OR (_call_id IS NOT NULL AND public.is_call_assigned_to_user(_user_id, _call_id))
$$;

REVOKE ALL ON FUNCTION public.has_any_role(uuid, uuid, public.app_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_any_role(uuid, uuid, public.app_role[]) FROM anon;
REVOKE ALL ON FUNCTION public.is_business_operator(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_operator(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_team_member_user(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_team_member_user(uuid, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_call_assigned_to_user(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_call_assigned_to_user(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_access_call(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_call(uuid, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_access_sms_thread(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_sms_thread(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_access_notification(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_notification(uuid, uuid, uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_operator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_member_user(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_call_assigned_to_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_call(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_sms_thread(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_notification(uuid, uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "members manage team invites" ON public.team_member_invites;
DROP POLICY IF EXISTS "operators manage team invites" ON public.team_member_invites;
CREATE POLICY "operators manage team invites" ON public.team_member_invites
  FOR ALL TO authenticated
  USING (public.is_business_operator(auth.uid(), business_id))
  WITH CHECK (public.is_business_operator(auth.uid(), business_id));

DROP POLICY IF EXISTS "members read calls" ON public.calls;
DROP POLICY IF EXISTS "members update calls" ON public.calls;
DROP POLICY IF EXISTS "operators and assigned agents read calls" ON public.calls;
DROP POLICY IF EXISTS "operators and assigned agents update calls" ON public.calls;
CREATE POLICY "operators and assigned agents read calls" ON public.calls
  FOR SELECT TO authenticated
  USING (public.can_access_call(auth.uid(), business_id, id));
CREATE POLICY "operators and assigned agents update calls" ON public.calls
  FOR UPDATE TO authenticated
  USING (public.can_access_call(auth.uid(), business_id, id))
  WITH CHECK (public.can_access_call(auth.uid(), business_id, id));

DROP POLICY IF EXISTS "members read assignments" ON public.lead_assignments;
DROP POLICY IF EXISTS "members write assignments" ON public.lead_assignments;
DROP POLICY IF EXISTS "members update assignments" ON public.lead_assignments;
DROP POLICY IF EXISTS "operators and assigned agents read assignments" ON public.lead_assignments;
DROP POLICY IF EXISTS "operators write assignments" ON public.lead_assignments;
DROP POLICY IF EXISTS "operators and assigned agents update assignments" ON public.lead_assignments;
CREATE POLICY "operators and assigned agents read assignments" ON public.lead_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_business_operator(auth.uid(), business_id)
    OR public.is_team_member_user(auth.uid(), business_id, team_member_id)
  );
CREATE POLICY "operators write assignments" ON public.lead_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_operator(auth.uid(), business_id));
CREATE POLICY "operators and assigned agents update assignments" ON public.lead_assignments
  FOR UPDATE TO authenticated
  USING (
    public.is_business_operator(auth.uid(), business_id)
    OR public.is_team_member_user(auth.uid(), business_id, team_member_id)
  )
  WITH CHECK (
    public.is_business_operator(auth.uid(), business_id)
    OR public.is_team_member_user(auth.uid(), business_id, team_member_id)
  );

DROP POLICY IF EXISTS "members read team" ON public.team_members;
DROP POLICY IF EXISTS "members write team" ON public.team_members;
DROP POLICY IF EXISTS "members update team" ON public.team_members;
DROP POLICY IF EXISTS "admins delete team" ON public.team_members;
DROP POLICY IF EXISTS "operators write team" ON public.team_members;
DROP POLICY IF EXISTS "operators update team" ON public.team_members;
DROP POLICY IF EXISTS "operators delete team" ON public.team_members;
CREATE POLICY "members read team" ON public.team_members
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "operators write team" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_operator(auth.uid(), business_id));
CREATE POLICY "operators update team" ON public.team_members
  FOR UPDATE TO authenticated
  USING (public.is_business_operator(auth.uid(), business_id))
  WITH CHECK (public.is_business_operator(auth.uid(), business_id));
CREATE POLICY "operators delete team" ON public.team_members
  FOR DELETE TO authenticated
  USING (public.is_business_operator(auth.uid(), business_id));

DROP POLICY IF EXISTS "members read appts" ON public.appointments;
DROP POLICY IF EXISTS "members write appts" ON public.appointments;
DROP POLICY IF EXISTS "members update appts" ON public.appointments;
DROP POLICY IF EXISTS "operators and assigned agents read appts" ON public.appointments;
DROP POLICY IF EXISTS "operators and assigned agents write appts" ON public.appointments;
DROP POLICY IF EXISTS "operators and assigned agents update appts" ON public.appointments;
CREATE POLICY "operators and assigned agents read appts" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    public.is_business_operator(auth.uid(), business_id)
    OR (team_member_id IS NOT NULL AND public.is_team_member_user(auth.uid(), business_id, team_member_id))
    OR (call_id IS NOT NULL AND public.is_call_assigned_to_user(auth.uid(), call_id))
  );
CREATE POLICY "operators and assigned agents write appts" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_operator(auth.uid(), business_id)
    OR (team_member_id IS NOT NULL AND public.is_team_member_user(auth.uid(), business_id, team_member_id))
  );
CREATE POLICY "operators and assigned agents update appts" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    public.is_business_operator(auth.uid(), business_id)
    OR (team_member_id IS NOT NULL AND public.is_team_member_user(auth.uid(), business_id, team_member_id))
  )
  WITH CHECK (
    public.is_business_operator(auth.uid(), business_id)
    OR (team_member_id IS NOT NULL AND public.is_team_member_user(auth.uid(), business_id, team_member_id))
  );

DROP POLICY IF EXISTS "members read blackouts" ON public.schedule_blackouts;
DROP POLICY IF EXISTS "members write blackouts" ON public.schedule_blackouts;
DROP POLICY IF EXISTS "members update blackouts" ON public.schedule_blackouts;
DROP POLICY IF EXISTS "members delete blackouts" ON public.schedule_blackouts;
DROP POLICY IF EXISTS "operators and agents read blackouts" ON public.schedule_blackouts;
DROP POLICY IF EXISTS "operators and agents write own blackouts" ON public.schedule_blackouts;
DROP POLICY IF EXISTS "operators and agents update own blackouts" ON public.schedule_blackouts;
DROP POLICY IF EXISTS "operators and agents delete own blackouts" ON public.schedule_blackouts;
CREATE POLICY "operators and agents read blackouts" ON public.schedule_blackouts
  FOR SELECT TO authenticated
  USING (
    public.is_business_operator(auth.uid(), business_id)
    OR (team_member_id IS NULL AND public.is_business_member(auth.uid(), business_id))
    OR public.is_team_member_user(auth.uid(), business_id, team_member_id)
  );
CREATE POLICY "operators and agents write own blackouts" ON public.schedule_blackouts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_operator(auth.uid(), business_id)
    OR (team_member_id IS NOT NULL AND public.is_team_member_user(auth.uid(), business_id, team_member_id))
  );
CREATE POLICY "operators and agents update own blackouts" ON public.schedule_blackouts
  FOR UPDATE TO authenticated
  USING (
    public.is_business_operator(auth.uid(), business_id)
    OR (team_member_id IS NOT NULL AND public.is_team_member_user(auth.uid(), business_id, team_member_id))
  )
  WITH CHECK (
    public.is_business_operator(auth.uid(), business_id)
    OR (team_member_id IS NOT NULL AND public.is_team_member_user(auth.uid(), business_id, team_member_id))
  );
CREATE POLICY "operators and agents delete own blackouts" ON public.schedule_blackouts
  FOR DELETE TO authenticated
  USING (
    public.is_business_operator(auth.uid(), business_id)
    OR (team_member_id IS NOT NULL AND public.is_team_member_user(auth.uid(), business_id, team_member_id))
  );

DROP POLICY IF EXISTS "members read notifications" ON public.notifications;
DROP POLICY IF EXISTS "members update notifications" ON public.notifications;
DROP POLICY IF EXISTS "operators and assigned agents read notifications" ON public.notifications;
DROP POLICY IF EXISTS "operators and assigned agents update notifications" ON public.notifications;
CREATE POLICY "operators and assigned agents read notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (public.can_access_notification(auth.uid(), business_id, call_id));
CREATE POLICY "operators and assigned agents update notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (public.can_access_notification(auth.uid(), business_id, call_id))
  WITH CHECK (public.can_access_notification(auth.uid(), business_id, call_id));

DROP POLICY IF EXISTS "members read threads" ON public.sms_threads;
DROP POLICY IF EXISTS "members read messages" ON public.sms_messages;
DROP POLICY IF EXISTS "operators and assigned agents read threads" ON public.sms_threads;
DROP POLICY IF EXISTS "operators and assigned agents read messages" ON public.sms_messages;
CREATE POLICY "operators and assigned agents read threads" ON public.sms_threads
  FOR SELECT TO authenticated
  USING (public.can_access_sms_thread(auth.uid(), id));
CREATE POLICY "operators and assigned agents read messages" ON public.sms_messages
  FOR SELECT TO authenticated
  USING (public.can_access_sms_thread(auth.uid(), thread_id));

DROP POLICY IF EXISTS "members read scripts" ON public.script_templates;
DROP POLICY IF EXISTS "members write scripts" ON public.script_templates;
DROP POLICY IF EXISTS "members update scripts" ON public.script_templates;
DROP POLICY IF EXISTS "members delete scripts" ON public.script_templates;
DROP POLICY IF EXISTS "operators read scripts" ON public.script_templates;
DROP POLICY IF EXISTS "operators write scripts" ON public.script_templates;
DROP POLICY IF EXISTS "operators update scripts" ON public.script_templates;
DROP POLICY IF EXISTS "operators delete scripts" ON public.script_templates;
CREATE POLICY "operators read scripts" ON public.script_templates
  FOR SELECT TO authenticated
  USING (public.is_business_operator(auth.uid(), business_id));
CREATE POLICY "operators write scripts" ON public.script_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_operator(auth.uid(), business_id));
CREATE POLICY "operators update scripts" ON public.script_templates
  FOR UPDATE TO authenticated
  USING (public.is_business_operator(auth.uid(), business_id))
  WITH CHECK (public.is_business_operator(auth.uid(), business_id));
CREATE POLICY "operators delete scripts" ON public.script_templates
  FOR DELETE TO authenticated
  USING (public.is_business_operator(auth.uid(), business_id));

DROP POLICY IF EXISTS "members read vapi numbers" ON public.vapi_number_assistants;
DROP POLICY IF EXISTS "members write vapi numbers" ON public.vapi_number_assistants;
DROP POLICY IF EXISTS "members update vapi numbers" ON public.vapi_number_assistants;
DROP POLICY IF EXISTS "members delete vapi numbers" ON public.vapi_number_assistants;
DROP POLICY IF EXISTS "operators read account assistant" ON public.vapi_number_assistants;
DROP POLICY IF EXISTS "operators write account assistant" ON public.vapi_number_assistants;
DROP POLICY IF EXISTS "operators update account assistant" ON public.vapi_number_assistants;
DROP POLICY IF EXISTS "operators delete account assistant" ON public.vapi_number_assistants;
CREATE POLICY "operators read account assistant" ON public.vapi_number_assistants
  FOR SELECT TO authenticated
  USING (public.is_business_operator(auth.uid(), business_id));
CREATE POLICY "operators write account assistant" ON public.vapi_number_assistants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_operator(auth.uid(), business_id));
CREATE POLICY "operators update account assistant" ON public.vapi_number_assistants
  FOR UPDATE TO authenticated
  USING (public.is_business_operator(auth.uid(), business_id))
  WITH CHECK (public.is_business_operator(auth.uid(), business_id));
CREATE POLICY "operators delete account assistant" ON public.vapi_number_assistants
  FOR DELETE TO authenticated
  USING (public.is_business_operator(auth.uid(), business_id));

CREATE OR REPLACE FUNCTION public.enforce_agent_call_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.is_business_operator(auth.uid(), OLD.business_id) THEN
    RETURN NEW;
  END IF;

  IF public.is_call_assigned_to_user(auth.uid(), OLD.id) THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.business_id IS DISTINCT FROM OLD.business_id
      OR NEW.caller_number IS DISTINCT FROM OLD.caller_number
      OR NEW.caller_name IS DISTINCT FROM OLD.caller_name
      OR NEW.recording_url IS DISTINCT FROM OLD.recording_url
      OR NEW.transcript IS DISTINCT FROM OLD.transcript
      OR NEW.ai_summary IS DISTINCT FROM OLD.ai_summary
      OR NEW.service_needed IS DISTINCT FROM OLD.service_needed
      OR NEW.urgency IS DISTINCT FROM OLD.urgency
      OR NEW.is_mobile IS DISTINCT FROM OLD.is_mobile
      OR NEW.twilio_call_sid IS DISTINCT FROM OLD.twilio_call_sid
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.priority IS DISTINCT FROM OLD.priority
      OR NEW.qualification IS DISTINCT FROM OLD.qualification
      OR NEW.ai_summary_short IS DISTINCT FROM OLD.ai_summary_short
      OR NEW.to_number IS DISTINCT FROM OLD.to_number
      OR NEW.vapi_call_id IS DISTINCT FROM OLD.vapi_call_id
      OR NEW.duration_seconds IS DISTINCT FROM OLD.duration_seconds
    THEN
      RAISE EXCEPTION 'Agent users can only update assigned lead status fields';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to update this lead';
END;
$$;

DROP TRIGGER IF EXISTS agent_call_update_guard ON public.calls;
CREATE TRIGGER agent_call_update_guard
  BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.enforce_agent_call_update_scope();

REVOKE ALL ON FUNCTION public.enforce_agent_call_update_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_agent_call_update_scope() FROM anon;
