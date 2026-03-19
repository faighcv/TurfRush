-- TurfRush Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_color VARCHAR(7) DEFAULT '#FF6B35',
  bio TEXT DEFAULT '',
  total_distance_m FLOAT DEFAULT 0,
  total_hexes INT DEFAULT 0,
  rank_score INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Territory ownership (one row per claimed hex)
CREATE TABLE IF NOT EXISTS hex_ownership (
  hex_id VARCHAR(20) PRIMARY KEY,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  capture_count INT DEFAULT 1
);

-- Activity sessions (a single walk/run/ride)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  distance_m FLOAT DEFAULT 0,
  hexes_captured INT DEFAULT 0,
  hexes_stolen INT DEFAULT 0,
  is_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw GPS track points per activity
CREATE TABLE IF NOT EXISTS gps_points (
  id BIGSERIAL PRIMARY KEY,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  speed_mps FLOAT DEFAULT 0,
  is_valid BOOLEAN DEFAULT TRUE
);

-- Friend relationships
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Social feed events
CREATE TABLE IF NOT EXISTS feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard snapshot (refreshed periodically)
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  city_rank INT,
  hex_count INT DEFAULT 0,
  weekly_hexes INT DEFAULT 0,
  weekly_distance_m FLOAT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hex_owner ON hex_ownership(owner_id);
CREATE INDEX IF NOT EXISTS idx_hex_activity ON hex_ownership(last_activity);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_activity ON gps_points(activity_id);
CREATE INDEX IF NOT EXISTS idx_feed_user ON feed_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friendship_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendship_addressee ON friendships(addressee_id);
