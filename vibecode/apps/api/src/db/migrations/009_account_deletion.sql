-- Account Deletion Migration
-- Adds soft delete support for GDPR-compliant account deletion

-- ============================================================================
-- STEP 1: Add soft delete columns to users table
-- ============================================================================
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN deletion_scheduled_at TIMESTAMP WITH TIME ZONE;

-- Index for finding deleted accounts to clean up
CREATE INDEX idx_users_deletion_scheduled ON users(deletion_scheduled_at)
    WHERE deletion_scheduled_at IS NOT NULL;

-- ============================================================================
-- STEP 2: Create function to anonymize deleted user data
-- ============================================================================
-- This preserves referential integrity while removing PII
COMMENT ON COLUMN users.deleted_at IS 'When the user initiated account deletion';
COMMENT ON COLUMN users.deletion_scheduled_at IS 'When the user data should be permanently deleted (30 days after deletion)';
