-- Content Moderation Migration
-- Adds reporting system for inappropriate content

-- ============================================================================
-- STEP 1: Create reports table
-- ============================================================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_shot_id UUID REFERENCES shots(id) ON DELETE CASCADE,
    reported_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL,
    details TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    action_taken VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- At least one target must be specified
    CONSTRAINT report_has_target CHECK (
        reported_user_id IS NOT NULL OR
        reported_shot_id IS NOT NULL OR
        reported_comment_id IS NOT NULL
    ),

    -- Valid reason values
    CONSTRAINT valid_reason CHECK (
        reason IN ('spam', 'harassment', 'inappropriate', 'impersonation', 'other')
    ),

    -- Valid status values
    CONSTRAINT valid_status CHECK (
        status IN ('pending', 'reviewed', 'actioned', 'dismissed')
    ),

    -- Valid action values
    CONSTRAINT valid_action CHECK (
        action_taken IS NULL OR
        action_taken IN ('none', 'warning', 'content_removed', 'user_banned')
    )
);

-- ============================================================================
-- STEP 2: Create indexes for efficient querying
-- ============================================================================
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id) WHERE reported_user_id IS NOT NULL;
CREATE INDEX idx_reports_reported_shot ON reports(reported_shot_id) WHERE reported_shot_id IS NOT NULL;
CREATE INDEX idx_reports_reported_comment ON reports(reported_comment_id) WHERE reported_comment_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Add is_admin column to users for moderation access
-- ============================================================================
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- STEP 4: Add comments for documentation
-- ============================================================================
COMMENT ON TABLE reports IS 'User-submitted reports of inappropriate content';
COMMENT ON COLUMN reports.reason IS 'Predefined reason: spam, harassment, inappropriate, impersonation, other';
COMMENT ON COLUMN reports.status IS 'Review status: pending, reviewed, actioned, dismissed';
COMMENT ON COLUMN reports.action_taken IS 'Action taken: none, warning, content_removed, user_banned';
