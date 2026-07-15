-- =============================================================================
-- VibeSocial — Notifications Schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  target_type   TEXT NOT NULL DEFAULT 'all',
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE,
  event_title   TEXT,
  link_url      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_all" ON notifications;
CREATE POLICY "notifications_select_all" ON notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "notifications_insert_auth" ON notifications;
CREATE POLICY "notifications_insert_auth" ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
