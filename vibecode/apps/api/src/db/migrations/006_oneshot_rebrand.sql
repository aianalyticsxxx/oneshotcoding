-- oneshotcoding Rebrand Migration
-- Transform from BeReal-style "vibes" to prompt-focused "shots"

-- ============================================================================
-- STEP 1: Rename vibes table to shots
-- ============================================================================
ALTER TABLE vibes RENAME TO shots;

-- Rename indexes
ALTER INDEX idx_vibes_created_at RENAME TO idx_shots_created_at;
ALTER INDEX idx_vibes_user_id RENAME TO idx_shots_user_id;
ALTER INDEX idx_vibes_vibe_date RENAME TO idx_shots_created_date;

-- ============================================================================
-- STEP 2: Modify shots table structure
-- ============================================================================

-- Add new columns for one-shot content model
ALTER TABLE shots ADD COLUMN prompt TEXT;
ALTER TABLE shots ADD COLUMN result_type VARCHAR(20) DEFAULT 'image';
ALTER TABLE shots ADD COLUMN embed_html TEXT;
ALTER TABLE shots ADD COLUMN external_url TEXT;

-- For existing data, use caption as prompt (or set a default)
UPDATE shots SET prompt = COALESCE(caption, 'One-shot creation');

-- Now make prompt required
ALTER TABLE shots ALTER COLUMN prompt SET NOT NULL;

-- Remove vibecheck-specific columns
ALTER TABLE shots DROP COLUMN IF EXISTS vibe_date;
ALTER TABLE shots DROP COLUMN IF EXISTS is_late;
ALTER TABLE shots DROP COLUMN IF EXISTS late_by_minutes;
ALTER TABLE shots DROP COLUMN IF EXISTS vibecheck_id;

-- Drop the unique constraint on user + date (no longer one per day)
ALTER TABLE shots DROP CONSTRAINT IF EXISTS unique_user_vibe_per_day;

-- ============================================================================
-- STEP 3: Create challenges table
-- ============================================================================
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_official BOOLEAN DEFAULT false,
    is_sponsored BOOLEAN DEFAULT false,
    sponsor_name VARCHAR(255),
    prize_description TEXT,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    voting_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_challenges_starts_at ON challenges(starts_at);
CREATE INDEX idx_challenges_ends_at ON challenges(ends_at);
CREATE INDEX idx_challenges_is_official ON challenges(is_official);

-- ============================================================================
-- STEP 4: Link shots to challenges (optional participation)
-- ============================================================================
ALTER TABLE shots ADD COLUMN challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL;
CREATE INDEX idx_shots_challenge_id ON shots(challenge_id);

-- ============================================================================
-- STEP 5: Create challenge votes table with weighted criteria
-- ============================================================================
CREATE TABLE challenge_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creativity_score INTEGER NOT NULL CHECK (creativity_score BETWEEN 1 AND 5),
    usefulness_score INTEGER NOT NULL CHECK (usefulness_score BETWEEN 1 AND 5),
    quality_score INTEGER NOT NULL CHECK (quality_score BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_vote_per_user_per_shot UNIQUE (shot_id, user_id)
);

CREATE INDEX idx_challenge_votes_shot_id ON challenge_votes(shot_id);
CREATE INDEX idx_challenge_votes_user_id ON challenge_votes(user_id);

-- ============================================================================
-- STEP 6: Drop vibecheck and streak tables (no longer needed)
-- ============================================================================
DROP TABLE IF EXISTS daily_vibechecks CASCADE;
DROP TABLE IF EXISTS user_streaks CASCADE;

-- ============================================================================
-- STEP 7: Update foreign key references in reactions table
-- ============================================================================
-- The reactions table already references vibes(id), which is now shots(id)
-- PostgreSQL handles this automatically when renaming tables

-- Rename vibe_id column to shot_id in reactions for clarity
ALTER TABLE reactions RENAME COLUMN vibe_id TO shot_id;

-- Update the unique constraint
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS unique_user_reaction_type_per_vibe;
ALTER TABLE reactions ADD CONSTRAINT unique_user_reaction_type_per_shot
    UNIQUE (shot_id, user_id, reaction_type);

-- ============================================================================
-- STEP 8: Update comments table
-- ============================================================================
ALTER TABLE comments RENAME COLUMN vibe_id TO shot_id;

-- ============================================================================
-- STEP 9: Add check constraint for result_type
-- ============================================================================
ALTER TABLE shots ADD CONSTRAINT valid_result_type
    CHECK (result_type IN ('image', 'video', 'link', 'embed'));
