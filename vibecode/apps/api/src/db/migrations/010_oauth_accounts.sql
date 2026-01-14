-- OAuth Accounts Migration
-- Adds multi-provider OAuth support (GitHub, X/Twitter, etc.)

-- ============================================================================
-- STEP 1: Create oauth_accounts table for multi-provider authentication
-- ============================================================================
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    provider_id TEXT NOT NULL,
    provider_username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);

COMMENT ON TABLE oauth_accounts IS 'OAuth provider credentials linked to user accounts';
COMMENT ON COLUMN oauth_accounts.provider IS 'OAuth provider name (github, x)';
COMMENT ON COLUMN oauth_accounts.provider_id IS 'User ID from the OAuth provider';
COMMENT ON COLUMN oauth_accounts.provider_username IS 'Username from the OAuth provider at time of auth';

-- ============================================================================
-- STEP 2: Migrate existing GitHub users to oauth_accounts
-- ============================================================================
INSERT INTO oauth_accounts (user_id, provider, provider_id, provider_username)
SELECT id, 'github', github_id::text, username
FROM users
WHERE github_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Remove github_id column from users table
-- ============================================================================
DROP INDEX IF EXISTS idx_users_github_id;
ALTER TABLE users DROP COLUMN github_id;
