import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getTerritoriesInViewport } from '../services/territoryEngine.js';
import { cellToBoundary } from 'h3-js';
import { query } from '../db/index.js';

const router = Router();

// GET /territory/viewport?minLat=&minLng=&maxLat=&maxLng=
// Returns all claimed hexes in the viewport as GeoJSON FeatureCollection
router.get('/viewport', requireAuth, async (req, res) => {
  try {
    const { minLat = 45.47, minLng = -73.62, maxLat = 45.53, maxLng = -73.52 } = req.query;
    const rows = await getTerritoriesInViewport(
      parseFloat(minLat), parseFloat(minLng),
      parseFloat(maxLat), parseFloat(maxLng)
    );

    const features = rows.map(row => {
      let boundary;
      try {
        boundary = cellToBoundary(row.hex_id);
      } catch {
        return null;
      }
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[...boundary.map(([lat, lng]) => [lng, lat]), [boundary[0][1], boundary[0][0]]]],
        },
        properties: {
          hexId: row.hex_id,
          ownerId: row.owner_id,
          username: row.username,
          color: row.avatar_color,
          capturedAt: row.captured_at,
          lastActivity: row.last_activity,
          captureCount: row.capture_count,
        },
      };
    }).filter(Boolean);

    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch territory' });
  }
});

// GET /territory/mine — all hexes owned by current user
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT hex_id, captured_at, last_activity, capture_count
       FROM hex_ownership WHERE owner_id = $1
       ORDER BY last_activity DESC`,
      [req.user.id]
    );
    res.json({ count: result.rows.length, hexes: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch territory' });
  }
});

// GET /territory/user/:userId
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT hex_id, captured_at, last_activity, capture_count
       FROM hex_ownership WHERE owner_id = $1
       ORDER BY last_activity DESC`,
      [req.params.userId]
    );
    res.json({ count: result.rows.length, hexes: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch territory' });
  }
});

export default router;
