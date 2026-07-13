-- =============================================================================
-- VibeSocial — Initial Database Schema
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Helper function for updated_at auto-update ───────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- USERS  (extends Supabase Auth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'attendee' CHECK (role IN ('attendee', 'organizer', 'admin')),
  notification_settings JSONB NOT NULL DEFAULT '{
    "push_enabled": true,
    "event_start_alerts": true,
    "status_updates": true,
    "crowd_level_changes": true,
    "wait_time_alerts": true,
    "chat_mentions": true,
    "weekly_digest": true
  }'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: users can read/update their own row; admins see all
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);


-- =============================================================================
-- EVENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS events (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                TEXT NOT NULL,
  venue_name           TEXT NOT NULL,
  venue_type           TEXT NOT NULL CHECK (venue_type IN ('club','lounge','bar','rooftop','house_party','pop_up','concert','other')),
  address              TEXT NOT NULL,
  state                CHAR(2) NOT NULL,
  lat                  DECIMAL(10, 8),
  lng                  DECIMAL(11, 8),
  description          TEXT,
  cover_image          TEXT,
  start_time           TIMESTAMPTZ,
  end_time             TIMESTAMPTZ,
  vibe_tags            TEXT[] NOT NULL DEFAULT '{}',
  current_vibe_score   DECIMAL(4,2) NOT NULL DEFAULT 0,
  current_crowd_level  TEXT CHECK (current_crowd_level IN ('empty','filling_up','active','busy','packed','at_capacity')),
  current_wait_time    TEXT CHECK (current_wait_time IN ('no_wait','5_min','15_min','30_min','45_plus_min')),
  status_count         INTEGER NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_by           UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_state ON events(state);
CREATE INDEX idx_events_venue_type ON events(venue_type);
CREATE INDEX idx_events_vibe_score ON events(current_vibe_score DESC);
CREATE INDEX idx_events_is_active ON events(is_active);
CREATE INDEX idx_events_created_by ON events(created_by);

CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_all" ON events FOR SELECT USING (true);
CREATE POLICY "events_insert_auth" ON events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "events_update_owner" ON events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "events_delete_owner" ON events FOR DELETE USING (auth.uid() = created_by);


-- =============================================================================
-- TICKET TYPES
-- =============================================================================
CREATE TABLE IF NOT EXISTS ticket_types (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  capacity        INTEGER CHECK (capacity > 0),
  tickets_sold    INTEGER NOT NULL DEFAULT 0,
  max_per_order   INTEGER NOT NULL DEFAULT 10,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_types_event_id ON ticket_types(event_id);

ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticket_types_select_all" ON ticket_types FOR SELECT USING (true);
CREATE POLICY "ticket_types_write_organizer" ON ticket_types
  FOR ALL USING (
    auth.uid() = (SELECT created_by FROM events WHERE id = ticket_types.event_id)
  );


-- =============================================================================
-- ORDERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id                 UUID NOT NULL REFERENCES events(id),
  buyer_id                 UUID NOT NULL REFERENCES users(id),
  attendee_name            TEXT NOT NULL,
  attendee_email           TEXT NOT NULL,
  tickets                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount             DECIMAL(10,2) NOT NULL DEFAULT 0,
  status                   TEXT NOT NULL DEFAULT 'pending_payment'
                             CHECK (status IN ('pending_payment','confirmed','cancelled','refunded')),
  confirmation_code        TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_confirmation_code ON orders(confirmation_code);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_buyer" ON orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "orders_insert_auth" ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);


-- =============================================================================
-- TICKETS (individual ticket instances)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tickets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id),
  ticket_type_id  UUID NOT NULL REFERENCES ticket_types(id),
  buyer_id        UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','used','cancelled')),
  qr_code_data    TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_buyer_id ON tickets(buyer_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_qr ON tickets(qr_code_data);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_select_buyer" ON tickets FOR SELECT USING (auth.uid() = buyer_id);


-- =============================================================================
-- STATUS UPDATES (live vibe reports)
-- =============================================================================
CREATE TABLE IF NOT EXISTS status_updates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  vibe_score    INTEGER NOT NULL CHECK (vibe_score BETWEEN 1 AND 10),
  crowd_level   TEXT CHECK (crowd_level IN ('empty','filling_up','active','busy','packed','at_capacity')),
  wait_time     TEXT CHECK (wait_time IN ('no_wait','5_min','15_min','30_min','45_plus_min')),
  music_vibe    TEXT CHECK (music_vibe IN ('fire','decent','mid','dead')),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_updates_event_id ON status_updates(event_id);
CREATE INDEX idx_status_updates_created_at ON status_updates(created_at DESC);

ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "status_select_all" ON status_updates FOR SELECT USING (true);
CREATE POLICY "status_insert_auth" ON status_updates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- =============================================================================
-- REVIEWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)  -- one review per user per event
);

CREATE INDEX idx_reviews_event_id ON reviews(event_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_auth" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- SAVED EVENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS saved_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX idx_saved_events_user_id ON saved_events(user_id);

ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_events_select_own" ON saved_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_events_insert_own" ON saved_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_events_delete_own" ON saved_events FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- USER ACTIVITIES (audit log)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_activities (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type  TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  metadata     JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);

ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_select_own" ON user_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activities_insert_own" ON user_activities FOR INSERT WITH CHECK (auth.uid() = user_id);


-- =============================================================================
-- STORED PROCEDURE: increment_tickets_sold (atomic counter)
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_tickets_sold(p_ticket_type_id UUID, p_quantity INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE ticket_types
  SET tickets_sold = tickets_sold + p_quantity
  WHERE id = p_ticket_type_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- STORAGE BUCKET
-- Run in Supabase Dashboard → Storage → Create Bucket
-- Name: vibesocial-uploads
-- Public: true
-- =============================================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('vibesocial-uploads', 'vibesocial-uploads', true);
