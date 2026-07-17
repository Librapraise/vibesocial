-- =============================================================================
-- VibeSocial — Notifications recipient scoping
-- =============================================================================

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
