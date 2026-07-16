-- =============================================================================
-- VibeSocial — Gamification and Leaderboards
-- =============================================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
