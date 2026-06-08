-- =============================================================================
-- Onboarding tutorial state
-- =============================================================================
-- One row per user tracking the state of their role-specific onboarding tour
-- (react-joyride on the frontend). The row is created lazily on first
-- GET /onboarding/me — we don't pre-create one per profile.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id               uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_steps       text[] NOT NULL DEFAULT '{}',
  tutorial_skipped      boolean NOT NULL DEFAULT false,
  tutorial_completed_at timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_onboarding IS
  'Tracks react-joyride tour state per user. Role-specific step lists are a frontend concern — the backend only stores which tour targets the user has completed.';

-- set_updated_at() already exists from earlier migrations
DROP TRIGGER IF EXISTS trg_user_onboarding_set_updated_at ON public.user_onboarding;
CREATE TRIGGER trg_user_onboarding_set_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

-- Rollback:
--   DROP TRIGGER IF EXISTS trg_user_onboarding_set_updated_at ON public.user_onboarding;
--   DROP TABLE IF EXISTS public.user_onboarding;
