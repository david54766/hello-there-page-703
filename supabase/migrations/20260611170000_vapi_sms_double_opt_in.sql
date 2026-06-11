ALTER TYPE public.sms_consent_status ADD VALUE IF NOT EXISTS 'pending';

ALTER TABLE public.sms_consents
  ADD COLUMN IF NOT EXISTS call_id uuid REFERENCES public.calls(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_ref text;

ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS vapi_call_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_calls_vapi_call_id
  ON public.calls (vapi_call_id)
  WHERE vapi_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sms_consents_call_id
  ON public.sms_consents (call_id);
