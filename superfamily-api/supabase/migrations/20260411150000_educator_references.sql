-- =============================================================================
-- Educator references
-- =============================================================================
-- Each educator must provide EXACTLY 2 references before their account can
-- be activated (business rule — enforced at the service layer, not in the
-- schema, so partial progress is allowed). The schema allows UP TO 5 rows
-- per educator so educators can edit / replace / keep backups, but not
-- spam the table.
--
-- Verification is a separate, admin-driven step done asynchronously — the
-- admin calls the reference by phone and flags it verified.
-- =============================================================================

BEGIN;

-- 1. Table ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.educator_references (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id          uuid NOT NULL REFERENCES public.educator_profiles(id) ON DELETE CASCADE,
  full_name            text NOT NULL,
  relationship         text,
  phone                text NOT NULL,
  email                text,
  address              text NOT NULL,
  testimonial          text NOT NULL
                         CHECK (char_length(testimonial) >= 50
                            AND char_length(testimonial) <= 1000),
  verified             boolean NOT NULL DEFAULT false,
  verified_at          timestamptz,
  verified_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verification_notes   text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.educator_references IS
  'Professional or personal references for educator accounts. Max 5 rows per educator enforced by trigger.';
COMMENT ON COLUMN public.educator_references.phone IS
  'Stored in E.164 format (+1XXXXXXXXXX) — normalized by the backend before insert.';

-- 2. Index ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_educator_references_educator
  ON public.educator_references(educator_id);

-- 3. Updated_at trigger --------------------------------------------------------
-- Reuses the set_updated_at() helper from earlier migrations.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_educator_references_set_updated_at ON public.educator_references;
CREATE TRIGGER trg_educator_references_set_updated_at
  BEFORE UPDATE ON public.educator_references
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Max-5 trigger -------------------------------------------------------------
-- Prevents educators from filling the table with spam. Checks only on
-- INSERT — UPDATE doesn't change the count.
CREATE OR REPLACE FUNCTION public.check_max_references()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.educator_references
    WHERE educator_id = NEW.educator_id
  ) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 références par éducateur'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_max_references ON public.educator_references;
CREATE TRIGGER enforce_max_references
  BEFORE INSERT ON public.educator_references
  FOR EACH ROW EXECUTE FUNCTION public.check_max_references();

COMMIT;

-- =============================================================================
-- Rollback:
--
-- BEGIN;
--   DROP TRIGGER IF EXISTS enforce_max_references ON public.educator_references;
--   DROP TRIGGER IF EXISTS trg_educator_references_set_updated_at ON public.educator_references;
--   -- keep check_max_references() and set_updated_at() for other tables
--   DROP INDEX IF EXISTS public.idx_educator_references_educator;
--   DROP TABLE IF EXISTS public.educator_references;
-- COMMIT;
-- =============================================================================
