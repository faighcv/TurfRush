import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = Router();

// GET /social/feed — activity feed of self + friends
router.get('/feed', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT fe.id, fe.event_type, fe.metadata, fe.created_at,
              u.username, u.avatar_color
       FROM feed_events fe
       JOIN users u ON fe.user_id = u.id
       WHERE fe.user_id = $1
         OR fe.user_id IN (
           SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END
           FROM friendships WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'
         )
       ORDER BY fe.created_at DESC
       LIMIT 30`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// GET /social/friends — list friends
router.get('/friends', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.avatar_color, u.total_hexes, u.last_active,
              f.status,
              CASE WHEN f.requester_id = $1 THEN 'outgoing' ELSE 'incoming' END as direction
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
       WHERE (f.requester_id = $1 OR f.addressee_id = $1)
       ORDER BY f.status, u.username`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// POST /social/friends/request — send friend request by username
router.post('/friends/request', requireAuth, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    const targetRes = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (!targetRes.rows.length) return res.status(404).json({ error: 'User not found' });

    const targetId = targetRes.rows[0].id;
    if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot friend yourself' });

    // Check existing
    const existsRes = await query(
      `SELECT id, status FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
      [req.user.id, targetId]
    );
    if (existsRes.rows.length) {
      return res.status(409).json({ error: 'Friend request already exists', status: existsRes.rows[0].status });
    }

    await query(
      `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, 'pending')`,
      [req.user.id, targetId]
    );
    res.status(201).json({ message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// POST /social/friends/:friendshipId/accept
router.post('/friends/:friendshipId/accept', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `UPDATE friendships SET status = 'accepted'
       WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
       RETURNING id`,
      [req.params.friendshipId, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Friend added!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// DELETE /social/friends/:friendshipId
router.delete('/friends/:friendshipId', requireAuth, async (req, res) => {
  try {
    await query(
      `DELETE FROM friendships WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2)`,
      [req.params.friendshipId, req.user.id]
    );
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// GET /social/search?q= — search users to add
router.get('/search', requireAuth, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  try {
    const result = await query(
      `SELECT id, username, avatar_color, total_hexes FROM users
       WHERE username ILIKE $1 AND id != $2 LIMIT 10`,
      [`%${q}%`, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
