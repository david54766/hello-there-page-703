ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS to_number text;
CREATE INDEX IF NOT EXISTS calls_business_to_number_idx ON public.calls (business_id, to_number);