-- =============================================================================
-- Optional references + training commitment
-- =============================================================================
-- Client clarified references are optional. Keep the max-5 guardrail but update
-- the schema comments to match the service rule. Add an educator profile flag
-- for people who are not yet trained but commit to taking training.
-- =============================================================================

BEGIN;

COMMENT ON TABLE public.educator_references IS
  'Optional professional or personal references for educator accounts. Max 5 rows per educator enforced by trigger.';

ALTER TABLE public.educator_profiles
  ADD COLUMN IF NOT EXISTS training_commitment boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.educator_profiles.training_commitment IS
  'Educator confirms they are willing to complete required/strongly recommended training if not already certified.';

COMMIT;

