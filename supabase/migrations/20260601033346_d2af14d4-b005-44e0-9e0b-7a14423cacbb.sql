
-- Holidays field on businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS observed_holidays jsonb NOT NULL DEFAULT '[]'::jsonb;

-- MFA factors per user
CREATE TABLE public.user_mfa_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  factor_type text NOT NULL CHECK (factor_type IN ('email','sms')),
  destination text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_mfa_factors TO authenticated;
GRANT ALL ON public.user_mfa_factors TO service_role;

ALTER TABLE public.user_mfa_factors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own factors" ON public.user_mfa_factors
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own factors" ON public.user_mfa_factors
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own factors" ON public.user_mfa_factors
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own factors" ON public.user_mfa_factors
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_user_mfa_factors_updated
  BEFORE UPDATE ON public.user_mfa_factors
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- MFA challenges (server-only via service_role)
CREATE TABLE public.mfa_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  factor_id uuid NOT NULL REFERENCES public.user_mfa_factors(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  destination_masked text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.mfa_challenges TO service_role;
ALTER TABLE public.mfa_challenges ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon: only service_role (server admin client) touches this table.

CREATE INDEX idx_mfa_challenges_user ON public.mfa_challenges(user_id);
