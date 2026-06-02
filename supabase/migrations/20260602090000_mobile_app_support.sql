-- Mobile app support: native push token registry and call forwarding status.

CREATE TABLE IF NOT EXISTS public.mobile_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('android')),
  token text NOT NULL,
  device_id text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_business
  ON public.mobile_push_tokens (business_id, disabled_at);

CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_user
  ON public.mobile_push_tokens (user_id, disabled_at);

ALTER TABLE public.mobile_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read mobile push tokens" ON public.mobile_push_tokens;
CREATE POLICY "members read mobile push tokens"
  ON public.mobile_push_tokens
  FOR SELECT
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

DROP POLICY IF EXISTS "users insert own mobile push tokens" ON public.mobile_push_tokens;
CREATE POLICY "users insert own mobile push tokens"
  ON public.mobile_push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_business_member(auth.uid(), business_id)
  );

DROP POLICY IF EXISTS "users update own mobile push tokens" ON public.mobile_push_tokens;
CREATE POLICY "users update own mobile push tokens"
  ON public.mobile_push_tokens
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.is_business_member(auth.uid(), business_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_business_member(auth.uid(), business_id)
  );

CREATE TABLE IF NOT EXISTS public.call_forwarding_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'instructions_viewed', 'dialer_opened', 'user_confirmed', 'test_detected', 'failed')),
  carrier public.carrier,
  forwarding_number text,
  dial_code text,
  last_test_id uuid REFERENCES public.forwarding_tests(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_forwarding_status_business
  ON public.call_forwarding_status (business_id, status);

ALTER TABLE public.call_forwarding_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read call forwarding status" ON public.call_forwarding_status;
CREATE POLICY "members read call forwarding status"
  ON public.call_forwarding_status
  FOR SELECT
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

DROP POLICY IF EXISTS "members write call forwarding status" ON public.call_forwarding_status;
CREATE POLICY "members write call forwarding status"
  ON public.call_forwarding_status
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_business_member(auth.uid(), business_id));

DROP POLICY IF EXISTS "members update call forwarding status" ON public.call_forwarding_status;
CREATE POLICY "members update call forwarding status"
  ON public.call_forwarding_status
  FOR UPDATE
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id))
  WITH CHECK (public.is_business_member(auth.uid(), business_id));

DROP TRIGGER IF EXISTS call_forwarding_status_touch ON public.call_forwarding_status;
CREATE TRIGGER call_forwarding_status_touch
  BEFORE UPDATE ON public.call_forwarding_status
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.call_forwarding_status;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
