-- Shared web/mobile call archive state.
-- Archived calls stay in public.calls so recovered-call and revenue metrics continue to count them.
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calls_business_archive_created
  ON public.calls (business_id, archived_at, created_at DESC);
