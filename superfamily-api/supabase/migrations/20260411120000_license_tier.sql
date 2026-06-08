-- =============================================================================
-- License tier system for educators
-- =============================================================================
-- Quebec childcare law caps the number of simultaneous children an educator
-- may supervise based on whether they hold a government license:
--   * No license (or pending/rejected)  → 5 children max
--   * Approved license                  → 15 children max
--
-- This migration adds:
--   1. `license_status` enum + columns on educator_profiles
--   2. A btree index on license_status (for the admin "pending" list)
--   3. A private Storage bucket `licenses` with RLS policies so educators can
--      upload their own document and admins can read any document.
--
-- Rollback: the `-- rollback` block at the end is a commented-out inverse.
-- =============================================================================

BEGIN;

-- 1. Enum -----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_status') THEN
    CREATE TYPE license_status AS ENUM ('none', 'pending', 'approved', 'rejected');
  END IF;
END$$;

-- 2. Columns --------------------------------------------------------------------
ALTER TABLE public.educator_profiles
  ADD COLUMN IF NOT EXISTS license_status license_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS license_document_url text,
  ADD COLUMN IF NOT EXISTS license_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS license_reviewed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS license_reviewed_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS license_rejection_reason text;

COMMENT ON COLUMN public.educator_profiles.license_status IS
  'Quebec government childcare license tier. Controls the max simultaneous children cap.';
COMMENT ON COLUMN public.educator_profiles.license_document_url IS
  'Path inside the `licenses` Storage bucket (not a full URL). Use the backend service client to sign.';

-- 3. Index ----------------------------------------------------------------------
-- The admin review page queries WHERE license_status = 'pending' ORDER BY license_submitted_at.
-- A partial index keeps it small (approved/rejected/none rows dominate in steady state).
CREATE INDEX IF NOT EXISTS educator_profiles_license_pending_idx
  ON public.educator_profiles (license_submitted_at)
  WHERE license_status = 'pending';

-- General index for the status filter when the set isn't 'pending'.
CREATE INDEX IF NOT EXISTS educator_profiles_license_status_idx
  ON public.educator_profiles (license_status);

-- 4. Storage bucket -------------------------------------------------------------
-- Private bucket. Files are keyed by educator_profile_id so each educator can
-- only reach their own path. Admins read via the backend service client (which
-- bypasses RLS) so we don't need an "admin reads all" Storage policy here.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'licenses',
  'licenses',
  false,
  10 * 1024 * 1024,  -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects for the 'licenses' bucket.
-- Educators may read/write files whose key starts with their own
-- educator_profile_id. We resolve educator_profile_id from the authenticated
-- auth.uid() via the profiles → educator_profiles chain.

DROP POLICY IF EXISTS "educators can upload own license"  ON storage.objects;
DROP POLICY IF EXISTS "educators can read own license"    ON storage.objects;
DROP POLICY IF EXISTS "educators can replace own license" ON storage.objects;

CREATE POLICY "educators can upload own license"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'licenses'
    AND (storage.foldername(name))[1] IN (
      SELECT ep.id::text
      FROM public.educator_profiles ep
      JOIN public.profiles p ON p.id = ep.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "educators can read own license"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'licenses'
    AND (storage.foldername(name))[1] IN (
      SELECT ep.id::text
      FROM public.educator_profiles ep
      JOIN public.profiles p ON p.id = ep.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "educators can replace own license"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'licenses'
    AND (storage.foldername(name))[1] IN (
      SELECT ep.id::text
      FROM public.educator_profiles ep
      JOIN public.profiles p ON p.id = ep.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

COMMIT;

-- =============================================================================
-- Rollback (manual):
--
-- BEGIN;
--   DROP POLICY IF EXISTS "educators can replace own license" ON storage.objects;
--   DROP POLICY IF EXISTS "educators can read own license"    ON storage.objects;
--   DROP POLICY IF EXISTS "educators can upload own license"  ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'licenses';
--   DROP INDEX IF EXISTS public.educator_profiles_license_status_idx;
--   DROP INDEX IF EXISTS public.educator_profiles_license_pending_idx;
--   ALTER TABLE public.educator_profiles
--     DROP COLUMN IF EXISTS license_rejection_reason,
--     DROP COLUMN IF EXISTS license_reviewed_by,
--     DROP COLUMN IF EXISTS license_reviewed_at,
--     DROP COLUMN IF EXISTS license_submitted_at,
--     DROP COLUMN IF EXISTS license_document_url,
--     DROP COLUMN IF EXISTS license_status;
--   DROP TYPE IF EXISTS license_status;
-- COMMIT;
-- =============================================================================
