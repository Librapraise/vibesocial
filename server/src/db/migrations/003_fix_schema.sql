-- =============================================================================
-- VibeSocial — Schema Hardening and Fixes Migration
-- =============================================================================

-- 1. Fix foreign key constraints on events (preventing invalid ON DELETE SET NULL for NOT NULL column)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE events ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- 2. Add columns to user_activities for rich check-in logging
ALTER TABLE user_activities 
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS venue_type TEXT CHECK (venue_type IN ('club','lounge','bar','rooftop','house_party','pop_up','concert','other')),
  ADD COLUMN IF NOT EXISTS vibe_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS check_in_method TEXT,
  ADD COLUMN IF NOT EXISTS check_in_verified BOOLEAN DEFAULT false;

-- 3. Add updated_at support for reviews
ALTER TABLE reviews 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
