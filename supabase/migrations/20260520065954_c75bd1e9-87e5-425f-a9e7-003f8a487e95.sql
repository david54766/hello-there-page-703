
CREATE TYPE public.lead_status AS ENUM ('open','contacted','scheduled','closed');
CREATE TYPE public.lead_priority AS ENUM ('normal','high');
CREATE TYPE public.callback_type AS ENUM ('immediate','scheduled');
CREATE TYPE public.callback_status AS ENUM ('pending','done','missed');
CREATE TYPE public.notification_kind AS ENUM ('sms','email','dashboard');

ALTER TABLE public.calls
  ADD COLUMN lead_status public.lead_status NOT NULL DEFAULT 'open',
  ADD COLUMN priority public.lead_priority NOT NULL DEFAULT 'normal',
  ADD COLUMN qualification jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN ai_summary_short text;

ALTER TABLE public.businesses
  ADD COLUMN notify_sms boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_email boolean NOT NULL DEFAULT false,
  ADD COLUMN notify_dashboard boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_email_address text,
  ADD COLUMN auto_send_ai_replies boolean NOT NULL DEFAULT true;

ALTER TABLE public.sms_threads
  ADD COLUMN suggestions jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE public.callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  call_id uuid,
  caller_number text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz,
  type public.callback_type NOT NULL DEFAULT 'immediate',
  status public.callback_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.callbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read callbacks" ON public.callbacks FOR SELECT TO authenticated USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "members update callbacks" ON public.callbacks FOR UPDATE TO authenticated USING (public.is_business_member(auth.uid(), business_id)) WITH CHECK (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "members insert callbacks" ON public.callbacks FOR INSERT TO authenticated WITH CHECK (public.is_business_member(auth.uid(), business_id));
CREATE TRIGGER touch_callbacks BEFORE UPDATE ON public.callbacks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  call_id uuid,
  kind public.notification_kind NOT NULL DEFAULT 'dashboard',
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read notifications" ON public.notifications FOR SELECT TO authenticated USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "members update notifications" ON public.notifications FOR UPDATE TO authenticated USING (public.is_business_member(auth.uid(), business_id)) WITH CHECK (public.is_business_member(auth.uid(), business_id));

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.callbacks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.callbacks;
