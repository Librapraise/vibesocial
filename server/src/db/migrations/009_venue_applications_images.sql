-- =============================================================================
-- VibeSocial — Add Images Array to Venue Applications
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- =============================================================================

ALTER TABLE venue_applications 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
