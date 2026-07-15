-- =============================================================================
-- VibeSocial — Stripe Connect Migration
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- =============================================================================

-- Add Stripe Connect columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT NOT NULL DEFAULT 'not_connected'
    CHECK (stripe_connect_status IN ('not_connected', 'pending', 'active')),
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quick lookup of connected organizers
CREATE INDEX IF NOT EXISTS idx_users_stripe_connect_id ON users(stripe_connect_id)
  WHERE stripe_connect_id IS NOT NULL;
