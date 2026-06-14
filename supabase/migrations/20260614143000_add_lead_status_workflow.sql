ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'active' AFTER 'scheduled';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'requesting_call' AFTER 'active';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'in_progress' AFTER 'requesting_call';
