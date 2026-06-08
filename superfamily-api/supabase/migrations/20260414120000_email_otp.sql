-- =============================================================================
-- Email OTP codes (backend-managed verification)
-- =============================================================================
-- Single table covering every OTP flow we run from the NestJS backend:
--
--   * signup_verification   — confirms the address during /inscription
--   * password_reset        — forgot-password flow (user isn't signed in)
--   * email_change          — confirms the new address during /parametres
--
-- Codes are stored hashed (SHA-256) so a DB leak can't hand an attacker a
-- live OTP. Hashing is keyed off the plaintext + row id, so two concurrent
-- codes for the same email/purpose don't collide.
-- =============================================================================

BEGIN;

-- 1. Enum ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_otp_purpose') THEN
    CREATE TYPE email_otp_purpose AS ENUM (
      'signup_verification',
      'password_reset',
      'email_change'
    );
  END IF;
END$$;

-- 2. Table --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_otps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- auth.users.id. Nullable because password_reset flows may target an email
  -- whose user we don't want to confirm/deny exists (enumeration defence).
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  purpose     email_otp_purpose NOT NULL,
  -- SHA-256 of the 6-digit OTP. Never store plaintext.
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  -- Set when the code is successfully redeemed. Non-null = already used.
  consumed_at timestamptz,
  attempts    int NOT NULL DEFAULT 0,
  -- Flow-specific payload (e.g., the new email for email_change). JSON so
  -- we can add fields without migrations.
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_otps IS
  'One-time codes emailed by the backend for signup verification, password reset, and email change. Codes are SHA-256 hashed; plaintext never hits the DB.';

-- Fast lookup by (email, purpose) — the common query when verifying a code.
CREATE INDEX IF NOT EXISTS idx_email_otps_email_purpose
  ON public.email_otps(email, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_otps_user
  ON public.email_otps(user_id)
  WHERE user_id IS NOT NULL;

-- 3. RLS ----------------------------------------------------------------------
-- Only the service role touches this table. Anon/authenticated clients have
-- no legitimate reason to read OTP rows — verification always goes through
-- the backend, which uses the service client.
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

COMMIT;
