/**
 * Runs all schema migrations on startup.
 * Safe to run multiple times — uses IF NOT EXISTS throughout.
 */
import { query } from './index.js';

export async function runMigrations() {
  // Challenges table (added after initial schema)
  await query(`
    CREATE TABLE IF NOT EXISTS challenges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      challenger_id UUID REFERENCES users(id) ON DELETE CASCADE,
      opponent_id UUID REFERENCES users(id) ON DELETE CASCADE,
      duration_minutes INT NOT NULL DEFAULT 30,
      status VARCHAR(20) DEFAULT 'pending',
      started_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
      challenger_hexes INT DEFAULT 0,
      opponent_hexes INT DEFAULT 0,
      challenger_distance_m FLOAT DEFAULT 0,
      opponent_distance_m FLOAT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, []);

  await query(`CREATE INDEX IF NOT EXISTS idx_challenge_challenger ON challenges(challenger_id)`, []);
  await query(`CREATE INDEX IF NOT EXISTS idx_challenge_opponent   ON challenges(opponent_id)`, []);
  await query(`CREATE INDEX IF NOT EXISTS idx_challenge_status     ON challenges(status)`, []);

  console.log('✅ Migrations applied');
}
