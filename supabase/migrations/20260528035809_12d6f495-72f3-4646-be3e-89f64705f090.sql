CREATE TYPE public.sms_consent_status AS ENUM ('opted_in', 'opted_out');

CREATE TABLE public.sms_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  caller_number text NOT NULL,
  status public.sms_consent_status NOT NULL,
  keyword text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_consents_business_caller ON public.sms_consents (business_id, caller_number, created_at DESC);

GRANT SELECT ON public.sms_consents TO authenticated;
GRANT ALL ON public.sms_consents TO service_role;

ALTER TABLE public.sms_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read consents"
ON public.sms_consents
FOR SELECT
TO authenticated
USING (public.is_business_member(auth.uid(), business_id));