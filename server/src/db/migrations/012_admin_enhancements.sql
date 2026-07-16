-- =============================================================================
-- VibeSocial — Admin enhancements migrations
-- =============================================================================

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  value       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO system_settings (key, value) VALUES 
('PLATFORM_FEE_PERCENT', '10'),
('SERVICE_FEE_CENTS', '150'),
('MAINTENANCE_MODE', 'false')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_system_settings" ON system_settings FOR SELECT USING (true);

-- 2. Content Moderation Reports Table
CREATE TABLE IF NOT EXISTS content_reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('event', 'review', 'status_update')),
  entity_id    UUID NOT NULL,
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_admin_all" ON content_reports FOR ALL USING (true); -- Full control by admin role checks on API layer

-- 3. Promo Codes Table (Can be platform-wide or event-specific)
CREATE TABLE IF NOT EXISTS promo_codes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value  DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses        INTEGER CHECK (max_uses > 0),
  used_count      INTEGER NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE, -- Null means platform-wide
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_active_promos" ON promo_codes FOR SELECT USING (is_active = true);
