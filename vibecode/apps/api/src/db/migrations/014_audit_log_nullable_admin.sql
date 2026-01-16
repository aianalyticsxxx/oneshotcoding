-- Allow null admin_user_id for automated/system actions (AI moderation auto-ban, etc.)
ALTER TABLE admin_audit_log ALTER COLUMN admin_user_id DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN admin_audit_log.admin_user_id IS 'NULL for automated system actions (AI moderation), otherwise references the admin user';
