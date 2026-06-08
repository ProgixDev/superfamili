-- =============================================================================
-- Educator document upload + review system
-- =============================================================================
-- Separate from the KYC flow (Didit handles ID verification automatically).
-- These documents are manually reviewed by an admin:
--
--   * background_check  — Quebec attestation d'antécédents judiciaires,
--                          dated within the last 6 months
--   * birth_certificate — one-time upload, never expires
--   * cpr_certification — RCR training, expires 3 years from issue date
--   * secondary_id      — optional, if Didit captured only one piece of ID
--
-- `government_license` is INTENTIONALLY NOT in this enum. The Quebec license
-- tier (see migration 20260411120000_license_tier.sql) has its own storage
-- bucket, its own admin review endpoint, and its own `license_status` column
-- on educator_profiles. Duplicating it here would create two sources of
-- truth for the same data.
-- =============================================================================

BEGIN;

-- 1. Enums ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM (
      'background_check',
      'birth_certificate',
      'cpr_certification',
      'secondary_id'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
    CREATE TYPE document_status AS ENUM (
      'pending_review',
      'approved',
      'rejected',
      'expired'
    );
  END IF;
END$$;

-- 2. Table ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.educator_documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id       uuid NOT NULL REFERENCES public.educator_profiles(id) ON DELETE CASCADE,
  document_type     document_type NOT NULL,
  file_url          text NOT NULL, -- Supabase Storage path: {educator_id}/{document_type}/{uuid}.{ext}
  file_size_bytes   integer NOT NULL,
  mime_type         text NOT NULL,
  status            document_status NOT NULL DEFAULT 'pending_review',
  issued_date       date,
  expires_at        timestamptz,
  rejection_reason  text,
  reviewed_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- A single educator may upload multiple versions of the same document type
  -- (e.g., re-upload after rejection, or renewing an expired background check).
  -- Uniqueness is on the created_at so replays don't accidentally merge rows.
  UNIQUE (educator_id, document_type, created_at)
);

COMMENT ON TABLE public.educator_documents IS
  'Manually-reviewed educator documents. Separate from Didit KYC (automated) and the Quebec license tier (dedicated flow).';
COMMENT ON COLUMN public.educator_documents.file_url IS
  'Path inside the `educator-documents` Storage bucket. NOT a full URL — the backend signs on demand.';
COMMENT ON COLUMN public.educator_documents.expires_at IS
  'Computed at upload time from the issued_date and document_type rules. NULL for birth_certificate.';

-- 3. Indexes -------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_educator_documents_educator
  ON public.educator_documents(educator_id);

CREATE INDEX IF NOT EXISTS idx_educator_documents_status
  ON public.educator_documents(status);

-- Partial index for the expiry cron — only indexes rows that can actually
-- expire (expires_at IS NOT NULL AND status = 'approved').
CREATE INDEX IF NOT EXISTS idx_educator_documents_expires
  ON public.educator_documents(expires_at)
  WHERE expires_at IS NOT NULL;

-- 4. updated_at trigger --------------------------------------------------------
-- Reuses the set_updated_at() function created by the KYC migration.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_educator_documents_set_updated_at ON public.educator_documents;
CREATE TRIGGER trg_educator_documents_set_updated_at
  BEFORE UPDATE ON public.educator_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Storage bucket ------------------------------------------------------------
-- Private bucket. Files keyed by {educator_profile_id}/{document_type}/{uuid}
-- so each educator can only reach their own path via RLS.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'educator-documents',
  'educator-documents',
  false,
  10 * 1024 * 1024, -- 10 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: the SPEC says "file uploads must go through the backend (never
-- direct-to-Supabase from the browser)". So we don't need the permissive
-- INSERT policy the license-tier bucket has. Only the service role (backend)
-- writes to this bucket; admins read via signed URLs minted server-side.
--
-- We DO keep a read policy so educators can use a signed URL in their own
-- tab — signed URLs bypass RLS, but we keep the policy as defense in depth
-- in case someone ever swaps the backend client for a user-JWT client.
DROP POLICY IF EXISTS "educators can read own documents" ON storage.objects;

CREATE POLICY "educators can read own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'educator-documents'
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
--   DROP POLICY IF EXISTS "educators can read own documents" ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'educator-documents';
--   DROP TRIGGER IF EXISTS trg_educator_documents_set_updated_at ON public.educator_documents;
--   DROP INDEX IF EXISTS public.idx_educator_documents_expires;
--   DROP INDEX IF EXISTS public.idx_educator_documents_status;
--   DROP INDEX IF EXISTS public.idx_educator_documents_educator;
--   DROP TABLE IF EXISTS public.educator_documents;
--   DROP TYPE IF EXISTS document_status;
--   DROP TYPE IF EXISTS document_type;
-- COMMIT;
-- =============================================================================
