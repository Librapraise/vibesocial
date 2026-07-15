-- =============================================================================
-- VibeSocial — Venue Applications Migration
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue_applications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_name       TEXT NOT NULL,
  venue_type       TEXT NOT NULL,
  address          TEXT NOT NULL,
  city             TEXT NOT NULL,
  state            TEXT NOT NULL,
  capacity         INTEGER,
  applicant_name   TEXT NOT NULL,
  applicant_email  TEXT NOT NULL,
  applicant_phone  TEXT,
  applicant_role   TEXT NOT NULL,
  description      TEXT,
  website          TEXT,
  social_media     TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_applications_user_id ON venue_applications(user_id);

-- Enable RLS
ALTER TABLE venue_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_apps_select_own" ON venue_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "venue_apps_insert_auth" ON venue_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
