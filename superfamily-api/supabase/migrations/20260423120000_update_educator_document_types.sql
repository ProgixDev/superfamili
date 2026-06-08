-- =============================================================================
-- Educator document type updates
-- =============================================================================
-- Adds:
--   * work_authorization — required proof of citizenship or valid work permit
--   * diploma            — optional, repeatable diplomas / training certificates
--
-- KYC remains separate and only verifies that the user is who they claim to be.
-- The Quebec childcare permit remains separate too because it controls the
-- 5-child vs 15-child capacity tier.
-- =============================================================================

BEGIN;

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'work_authorization';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'diploma';

COMMENT ON TYPE document_type IS
  'Educator documents: background_check, birth_certificate, cpr_certification, work_authorization, secondary_id, diploma. Separate from KYC and Quebec childcare license tier.';

COMMIT;

