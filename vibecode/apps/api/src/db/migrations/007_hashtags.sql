-- Hashtag System Migration
-- Adds support for extracting and storing hashtags from shots

-- ============================================================================
-- STEP 1: Create tags table (normalized, lowercase)
-- ============================================================================
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tags_name ON tags(name);

-- ============================================================================
-- STEP 2: Create junction table for many-to-many relationship
-- ============================================================================
CREATE TABLE shot_tags (
    shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (shot_id, tag_id)
);

CREATE INDEX idx_shot_tags_tag_id ON shot_tags(tag_id);
CREATE INDEX idx_shot_tags_created_at ON shot_tags(created_at);
