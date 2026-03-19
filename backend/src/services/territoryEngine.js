/**
 * Territory Engine
 * Converts validated GPS points → H3 hexes → ownership updates
 *
 * Capture rules:
 * - Unclaimed hex: instantly claimed by entering it
 * - Own hex: refreshes last_activity (keeps it alive)
 * - Enemy hex: claimed if user has visited it 2+ times this session
 *   (simplified "challenge" mechanic for MVP)
 *
 * Decay: hexes with last_activity > 7 days lose ownership (runs on query)
 */

import { latLngToCell } from 'h3-js';
import { query } from '../db/index.js';

const H3_RES = 10;
const STEAL_THRESHOLD = 2; // visits to steal an enemy hex

/**
 * Process a validated GPS track for a user.
 * Returns { captured, refreshed, stolen, totalNew }
 */
export async function processTrack(userId, validPoints) {
  if (!validPoints.length) return { captured: 0, refreshed: 0, stolen: 0, totalNew: 0 };

  // Build a frequency map of hexes visited this session
  const hexVisits = new Map();
  for (const pt of validPoints) {
    const hexId = latLngToCell(pt.lat, pt.lng, H3_RES);
    hexVisits.set(hexId, (hexVisits.get(hexId) || 0) + 1);
  }

  const hexIds = [...hexVisits.keys()];
  if (!hexIds.length) return { captured: 0, refreshed: 0, stolen: 0, totalNew: 0 };

  // Fetch current ownership for all visited hexes in one query
  const placeholders = hexIds.map((_, i) => `$${i + 1}`).join(',');
  const ownershipRes = await query(
    `SELECT hex_id, owner_id FROM hex_ownership WHERE hex_id IN (${placeholders})`,
    hexIds
  );
  const owned = new Map(ownershipRes.rows.map(r => [r.hex_id, r.owner_id]));

  let captured = 0, refreshed = 0, stolen = 0;
  const now = new Date();

  for (const [hexId, visits] of hexVisits) {
    const currentOwner = owned.get(hexId);

    if (!currentOwner) {
      // Unclaimed → capture
      await query(
        `INSERT INTO hex_ownership (hex_id, owner_id, captured_at, last_activity, capture_count)
         VALUES ($1, $2, $3, $3, 1)
         ON CONFLICT (hex_id) DO UPDATE
           SET owner_id = $2, captured_at = $3, last_activity = $3, capture_count = 1`,
        [hexId, userId, now]
      );
      captured++;
    } else if (currentOwner === userId) {
      // Own hex → refresh
      await query(
        `UPDATE hex_ownership SET last_activity = $1, capture_count = capture_count + 1 WHERE hex_id = $2`,
        [now, hexId]
      );
      refreshed++;
    } else if (visits >= STEAL_THRESHOLD) {
      // Enemy hex + enough visits → steal
      await query(
        `UPDATE hex_ownership SET owner_id = $1, captured_at = $2, last_activity = $2, capture_count = 1 WHERE hex_id = $3`,
        [userId, now, hexId]
      );
      stolen++;
      captured++;
    }
  }

  const totalNew = captured;

  // Update user stats
  if (totalNew > 0) {
    await query(
      `UPDATE users SET total_hexes = (
         SELECT COUNT(*) FROM hex_ownership WHERE owner_id = $1
       ), last_active = NOW() WHERE id = $1`,
      [userId]
    );
  }

  return { captured, refreshed, stolen, totalNew };
}

/**
 * Fetch all hex territories within a bounding box.
 * Returns rows suitable for rendering as GeoJSON.
 */
export async function getTerritoriesInViewport(minLat, minLng, maxLat, maxLng) {
  // We fetch all hexes and let the caller filter by lat/lng
  // For MVP this is fine; production would use H3 spatial index
  const res = await query(
    `SELECT h.hex_id, h.owner_id, h.captured_at, h.last_activity, h.capture_count,
            u.username, u.avatar_color
     FROM hex_ownership h
     JOIN users u ON h.owner_id = u.id
     WHERE h.owner_id IS NOT NULL`,
    []
  );
  return res.rows;
}

/**
 * Apply territory decay: hexes inactive for >7 days lose ownership.
 */
export async function applyDecay() {
  const res = await query(
    `UPDATE hex_ownership SET owner_id = NULL WHERE last_activity < NOW() - INTERVAL '7 days'`
  );
  return res.rowCount;
}
