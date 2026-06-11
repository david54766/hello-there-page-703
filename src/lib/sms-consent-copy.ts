export const AI_VERBAL_SMS_OPT_IN_PROMPT =
  "Would you also like a text confirmation? This is optional — we'll call you back either way.";

export const DOUBLE_OPT_IN_CONFIRMATION_SMS =
  'Classroom Panda LLC dba CallRecover: Reply YES to confirm SMS updates about your request. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of service.';

export const WEB_FORM_SMS_CONSENT_TEXT =
  'By checking this box and submitting, I agree to receive transactional SMS messages from Classroom Panda LLC dba CallRecover related to my service request, appointment scheduling, and lead follow-up at the mobile number provided. Reply STOP to opt out, HELP for help. Message frequency varies. Msg & data rates may apply. Consent is not a condition of purchase. See https://callrecover.net/privacy-policy and https://callrecover.net/terms.';

export const TCR_SMS_CONSENT_DESCRIPTION = `Verbal + SMS double opt-in. Our AI voice agent answers the caller's forwarded call, takes their details, then asks: "${AI_VERBAL_SMS_OPT_IN_PROMPT}" If they say yes and called from a mobile, we send one message: "${DOUBLE_OPT_IN_CONFIRMATION_SMS}" Only after they reply YES do further messages send. Call recording, transcript, number, timestamp, and YES reply are stored.

Web form at https://callrecover.net/sms-opt-in. Visitor enters name and mobile and checks an unchecked box agreeing to receive transactional SMS from Classroom Panda LLC dba CallRecover, with STOP/HELP language and "Consent is not a condition of purchase." Timestamp, IP, and consent text are stored.`;
