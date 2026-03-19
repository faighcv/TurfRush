import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateTrack } from '../services/anticheat.js';
import { processTrack } from '../services/territoryEngine.js';
import { broadcastTerritoryUpdate, notifyUser } from '../socket/index.js';
import { query } from '../db/index.js';

const router = Router();

// POST /activity/start — start a new activity session
router.post('/start', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `INSERT INTO activities (user_id, started_at) VALUES ($1, NOW()) RETURNING id`,
      [req.user.id]
    );
    res.status(201).json({ activityId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start activity' });
  }
});

// POST /activity/:activityId/points — submit a batch of GPS points
// Body: { points: [{lat, lng, timestamp}] }
router.post('/:activityId/points', requireAuth, async (req, res) => {
  const { activityId } = req.params;
  const { points } = req.body;

  if (!Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ error: 'No points provided' });
  }

  // Verify this activity belongs to this user
  const actCheck = await query(
    `SELECT id FROM activities WHERE id = $1 AND user_id = $2 AND ended_at IS NULL`,
    [activityId, req.user.id]
  );
  if (!actCheck.rows.length) {
    return res.status(403).json({ error: 'Activity not found or already ended' });
  }

  try {
    const { valid, invalid, totalDistanceM, warnings } = validateTrack(points);

    if (valid.length === 0) {
      return res.json({ accepted: 0, warnings, captured: 0, stolen: 0 });
    }

    // Store valid GPS points
    for (const pt of valid) {
      await query(
        `INSERT INTO gps_points (activity_id, lat, lng, recorded_at, speed_mps, is_valid)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [activityId, pt.lat, pt.lng, pt.timestamp, pt.speed_mps || 0]
      );
    }

    // Process territory capture
    const territoryResult = await processTrack(req.user.id, valid);

    // Update activity stats
    await query(
      `UPDATE activities
       SET distance_m = distance_m + $1,
           hexes_captured = hexes_captured + $2,
           hexes_stolen = hexes_stolen + $3
       WHERE id = $4`,
      [totalDistanceM, territoryResult.captured, territoryResult.stolen, activityId]
    );

    // Broadcast territory change to all city viewers
    if (territoryResult.totalNew > 0) {
      broadcastTerritoryUpdate({ userId: req.user.id, hexes: territoryResult.totalNew });
    }

    res.json({
      accepted: valid.length,
      rejected: invalid.length,
      warnings,
      distanceM: totalDistanceM,
      ...territoryResult,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process points' });
  }
});

// POST /activity/:activityId/end — end an activity session
router.post('/:activityId/end', requireAuth, async (req, res) => {
  const { activityId } = req.params;
  try {
    const result = await query(
      `UPDATE activities SET ended_at = NOW()
       WHERE id = $1 AND user_id = $2 AND ended_at IS NULL
       RETURNING *`,
      [activityId, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Activity not found' });

    const act = result.rows[0];

    // Update user total distance
    await query(
      `UPDATE users SET total_distance_m = total_distance_m + $1 WHERE id = $2`,
      [act.distance_m, req.user.id]
    );

    // Create feed event if significant
    if (act.hexes_captured >= 1) {
      await query(
        `INSERT INTO feed_events (user_id, event_type, metadata)
         VALUES ($1, 'captured', $2)`,
        [req.user.id, JSON.stringify({ hexes: act.hexes_captured, stolen: act.hexes_stolen })]
      );
    }

    // Notify user of activity summary
    notifyUser(req.user.id, 'activity:ended', {
      distanceM: act.distance_m,
      hexesCaptured: act.hexes_captured,
      hexesStolen: act.hexes_stolen,
    });

    res.json(act);
  } catch (err) {
    res.status(500).json({ error: 'Failed to end activity' });
  }
});

// GET /activity/recent — recent activities for current user
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, started_at, ended_at, distance_m, hexes_captured, hexes_stolen
       FROM activities
       WHERE user_id = $1 AND is_valid = true
       ORDER BY created_at DESC LIMIT 10`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

export default router;
