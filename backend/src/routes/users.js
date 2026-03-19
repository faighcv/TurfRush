import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = Router();

// GET /users/me — current user profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, email, avatar_color, bio, total_hexes, total_distance_m, rank_score,
              current_streak, longest_streak, created_at, last_active
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH /users/me — update profile
router.patch('/me', requireAuth, async (req, res) => {
  const { bio, avatar_color } = req.body;
  try {
    const result = await query(
      `UPDATE users SET
         bio = COALESCE($1, bio),
         avatar_color = COALESCE($2, avatar_color)
       WHERE id = $3
       RETURNING id, username, email, avatar_color, bio, total_hexes, total_distance_m, rank_score`,
      [bio, avatar_color, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// GET /users/:username — public profile
router.get('/:username', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, avatar_color, bio, total_hexes, total_distance_m, rank_score,
              current_streak, longest_streak, created_at
       FROM users WHERE username = $1`,
      [req.params.username]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /users/me/stats — detailed stats
router.get('/me/stats', requireAuth, async (req, res) => {
  try {
    const [statsRes, todayRes, weekRes] = await Promise.all([
      query(`SELECT total_hexes, total_distance_m, rank_score, current_streak FROM users WHERE id = $1`, [req.user.id]),
      query(
        `SELECT COALESCE(SUM(distance_m),0) as today_distance,
                COALESCE(SUM(hexes_captured),0) as today_hexes
         FROM activities
         WHERE user_id = $1 AND created_at >= CURRENT_DATE AND is_valid = true`,
        [req.user.id]
      ),
      query(
        `SELECT COALESCE(SUM(distance_m),0) as week_distance,
                COALESCE(SUM(hexes_captured),0) as week_hexes
         FROM activities
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days' AND is_valid = true`,
        [req.user.id]
      ),
    ]);
    res.json({
      ...statsRes.rows[0],
      ...todayRes.rows[0],
      ...weekRes.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
