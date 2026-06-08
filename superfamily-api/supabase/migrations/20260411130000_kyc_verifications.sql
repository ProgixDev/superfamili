-- =============================================================================
-- KYC verifications — Didit integration
-- =============================================================================
-- Persists one row per Didit verification session (audit trail, raw webhook
-- payload for debugging) and a mirror `kyc_status` column on educator_profiles
-- for fast reads. Unrelated to the Quebec `license_status` column — they are
-- independent gates.
--
-- Didit echoes a `vendor_data` string in every webhook; we set it to the
-- profiles.id UUID at session creation time so the webhook handler can find
-- the row again. The `user_id` column here references profiles(id) for
-- consistency with the rest of the schema (the name is slightly misleading —
-- it's actually a profile id, not an auth.users id).
-- =============================================================================

BEGIN;

-- 1. Enum -----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status') THEN
    CREATE TYPE kyc_status AS ENUM (
      'not_started',
      'in_progress',
      'approved',
      'declined',
      'expired',
      'review_required'
    );
  END IF;
END$$;

-- 2. kyc_verifications table ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kyc_verifications (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  didit_session_id         text UNIQUE,
  didit_session_url        text,
  status                   kyc_status NOT NULL DEFAULT 'not_started',
  confidence_score         numeric(5,2),
  decision                 text,
  id_document_type         text,
  id_document_country      text,
  extracted_full_name      text,
  extracted_date_of_birth  date,
  extracted_document_number text,
  raw_webhook_payload      jsonb,
  expires_at               timestamptz,
  started_at               timestamptz,
  completed_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.kyc_verifications IS
  'One row per Didit verification session. Upserted on every webhook event; audit trail.';
COMMENT ON COLUMN public.kyc_verifications.user_id IS
  'References profiles.id — the column is named user_id for historical reasons but holds a profile id.';

-- 3. Indexes -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_id
  ON public.kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_status
  ON public.kyc_verifications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_session_id
  ON public.kyc_verifications(didit_session_id);

-- 4. updated_at trigger --------------------------------------------------------
-- Auto-maintains the updated_at column whenever a row is written. Done as a
-- shared function so other tables can reuse it.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kyc_verifications_set_updated_at ON public.kyc_verifications;
CREATE TRIGGER trg_kyc_verifications_set_updated_at
  BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Mirror columns on educator_profiles ---------------------------------------
-- Fast-read cache for "is this educator KYC'd?". Source of truth is still
-- kyc_verifications; we mirror to avoid a join on every profile fetch.
ALTER TABLE public.educator_profiles
  ADD COLUMN IF NOT EXISTS kyc_status kyc_status NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz;

CREATE INDEX IF NOT EXISTS educator_profiles_kyc_status_idx
  ON public.educator_profiles(kyc_status);

COMMIT;

-- =============================================================================
-- Rollback (manual):
--
-- BEGIN;
--   DROP INDEX IF EXISTS public.educator_profiles_kyc_status_idx;
--   ALTER TABLE public.educator_profiles
--     DROP COLUMN IF EXISTS kyc_verified_at,
--     DROP COLUMN IF EXISTS kyc_status;
--   DROP TRIGGER IF EXISTS trg_kyc_verifications_set_updated_at ON public.kyc_verifications;
--   -- keep set_updated_at() if other tables use it
--   DROP INDEX IF EXISTS public.idx_kyc_verifications_session_id;
--   DROP INDEX IF EXISTS public.idx_kyc_verifications_status;
--   DROP INDEX IF EXISTS public.idx_kyc_verifications_user_id;
--   DROP TABLE IF EXISTS public.kyc_verifications;
--   DROP TYPE IF EXISTS kyc_status;
-- COMMIT;
-- =============================================================================
