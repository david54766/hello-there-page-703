-- CallRecover accounts use one assigned Vapi number and one assistant.
-- Keep the newest provisioned row if an older environment already has duplicates.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY business_id
      ORDER BY
        (assistant_id IS NOT NULL) DESC,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM public.vapi_number_assistants
)
DELETE FROM public.vapi_number_assistants v
USING ranked r
WHERE v.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS vapi_number_assistants_one_per_business_idx
  ON public.vapi_number_assistants (business_id);
