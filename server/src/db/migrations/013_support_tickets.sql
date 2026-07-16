-- =============================================================================
-- VibeSocial — Support Tickets Migration
-- =============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  category    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policies:
-- Users can see/insert their own tickets
CREATE POLICY "select_own_support_tickets" ON support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own_support_tickets" ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "admin_all_support_tickets" ON support_tickets FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
