-- Lock business-level SMS consent copy to CallRecover's Twilio/TCR-approved wording.
-- Clients may not customize this field, because unsafe edits can create A2P/TCR risk.

CREATE OR REPLACE FUNCTION public.callrecover_locked_sms_consent_text()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'By checking this box and submitting, I agree to receive transactional SMS messages from Classroom Panda LLC dba CallRecover related to my service request, appointment scheduling, and lead follow-up at the mobile number provided. Reply STOP to opt out, HELP for help. Message frequency varies. Msg & data rates may apply. Consent is not a condition of purchase. See https://callrecover.net/privacy-policy and https://callrecover.net/terms.'::text;
$$;

CREATE OR REPLACE FUNCTION public.enforce_locked_business_sms_consent_text()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.sms_consent_text := public.callrecover_locked_sms_consent_text();
  RETURN NEW;
END;
$$;

UPDATE public.businesses
SET sms_consent_text = public.callrecover_locked_sms_consent_text()
WHERE sms_consent_text IS DISTINCT FROM public.callrecover_locked_sms_consent_text();

DROP TRIGGER IF EXISTS enforce_locked_business_sms_consent_text ON public.businesses;

CREATE TRIGGER enforce_locked_business_sms_consent_text
BEFORE INSERT OR UPDATE OF sms_consent_text ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_locked_business_sms_consent_text();
