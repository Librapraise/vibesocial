-- =============================================================================
-- VibeSocial — Subscription Stripe IDs Migration
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
