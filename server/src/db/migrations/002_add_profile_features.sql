-- =============================================================================
-- VibeSocial — Profile Customization Migration
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- =============================================================================

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS vibe_preferences TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB NOT NULL DEFAULT '{"is_private": false, "show_on_leaderboard": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'plus', 'vip'));
