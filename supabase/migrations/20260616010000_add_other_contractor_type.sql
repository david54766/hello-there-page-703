INSERT INTO public.script_templates (
  business_id,
  contractor_type,
  kind,
  label,
  body,
  is_default
)
SELECT
  b.id,
  'other',
  template.kind,
  template.label,
  template.body,
  template.is_default
FROM public.businesses b
CROSS JOIN (
  VALUES
    (
      'first_message',
      'Other - Standard first message',
      'Hi, thanks for calling {business}. I''m the virtual assistant. I can take your details, help route your request, or arrange a callback. What can I help with today?',
      true
    ),
    (
      'system',
      'Other - Virtual agent behavior',
      'You are a friendly, professional virtual assistant for {business}. Identify that you are a virtual assistant, collect the caller''s name, phone number, reason for calling, and urgency. If scheduling is enabled, offer to collect appointment or estimate preferences. If scheduling is disabled, collect the preferred callback time and say the team will follow up. If they ask about the business, use {website_info}. If they ask for text messages, use {sms_consent}. Keep replies short, natural, and helpful.',
      true
    )
) AS template(kind, label, body, is_default)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.script_templates st
  WHERE st.business_id = b.id
    AND st.contractor_type = 'other'
    AND st.kind = template.kind
    AND st.label = template.label
);
