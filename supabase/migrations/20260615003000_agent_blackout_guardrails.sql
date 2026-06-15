-- Guardrails for business-wide and agent-specific scheduling blackouts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schedule_blackouts_time_range_check'
  ) THEN
    ALTER TABLE public.schedule_blackouts
      ADD CONSTRAINT schedule_blackouts_time_range_check
      CHECK (end_at > start_at) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schedule_blackouts_team_member_id_fkey'
  ) THEN
    ALTER TABLE public.schedule_blackouts
      ADD CONSTRAINT schedule_blackouts_team_member_id_fkey
      FOREIGN KEY (team_member_id)
      REFERENCES public.team_members(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_schedule_blackouts_business_range
  ON public.schedule_blackouts (business_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_schedule_blackouts_team_range
  ON public.schedule_blackouts (business_id, team_member_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_schedule_blackouts_team_member_id
  ON public.schedule_blackouts (team_member_id);
