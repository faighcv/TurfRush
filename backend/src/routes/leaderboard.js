import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = Router();

// GET /leaderboard/city — top 50 by total hexes
router.get('/city', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.avatar_color, u.total_hexes, u.total_distance_m,
              u.rank_score, u.current_streak,
              RANK() OVER (ORDER BY u.total_hexes DESC) as city_rank
       FROM users u
       ORDER BY u.total_hexes DESC
       LIMIT 50`
    );

    // Find current user's rank
    const myRank = await query(
      `SELECT COUNT(*)+1 as rank FROM users WHERE total_hexes > (SELECT total_hexes FROM users WHERE id = $1)`,
      [req.user.id]
    );

    res.json({
      leaders: result.rows,
      myRank: parseInt(myRank.rows[0].rank),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /leaderboard/friends — friends + self ranked by hexes
router.get('/friends', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.avatar_color, u.total_hexes, u.total_distance_m,
              u.rank_score, u.current_streak
       FROM users u
       WHERE u.id = $1
         OR u.id IN (
           SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END
           FROM friendships WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'
         )
       ORDER BY u.total_hexes DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch friends leaderboard' });
  }
});

// GET /leaderboard/weekly — top by hexes captured this week
router.get('/weekly', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.avatar_color,
              COALESCE(SUM(a.hexes_captured), 0) as weekly_hexes,
              COALESCE(SUM(a.distance_m), 0) as weekly_distance
       FROM users u
       LEFT JOIN activities a ON a.user_id = u.id
         AND a.created_at >= NOW() - INTERVAL '7 days'
         AND a.is_valid = true
       GROUP BY u.id
       ORDER BY weekly_hexes DESC
       LIMIT 20`,
      []
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch weekly leaderboard' });
  }
});

export default router;
