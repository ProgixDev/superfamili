-- =============================================================================
-- Profile photo uploads
-- =============================================================================
-- Avatars are uploaded through the backend service client to keep validation
-- and profile updates in one audited API path. The bucket is public because
-- avatar_url is shown in public educator search/profile cards.
-- =============================================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5 * 1024 * 1024,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;

