import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';
import { notifyUser } from '../socket/index.js';

const router = Router();

// GET /challenges/my — all challenges for current user
router.get('/my', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*,
              ch.username AS challenger_username, ch.avatar_color AS challenger_color,
              op.username AS opponent_username,   op.avatar_color AS opponent_color,
              w.username  AS winner_username
       FROM challenges c
       JOIN users ch ON c.challenger_id = ch.id
       JOIN users op ON c.opponent_id   = op.id
       LEFT JOIN users w ON c.winner_id = w.id
       WHERE c.challenger_id = $1 OR c.opponent_id = $1
       ORDER BY c.created_at DESC
       LIMIT 30`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// GET /challenges/:id — single challenge
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*,
              ch.username AS challenger_username, ch.avatar_color AS challenger_color,
              op.username AS opponent_username,   op.avatar_color AS opponent_color,
              w.username  AS winner_username
       FROM challenges c
       JOIN users ch ON c.challenger_id = ch.id
       JOIN users op ON c.opponent_id   = op.id
       LEFT JOIN users w ON c.winner_id = w.id
       WHERE c.id = $1 AND (c.challenger_id = $2 OR c.opponent_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Challenge not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

// POST /challenges — create a challenge (invite a friend)
// Body: { opponentId, durationMinutes }
router.post('/', requireAuth, async (req, res) => {
  const { opponentId, durationMinutes = 30 } = req.body;
  if (!opponentId) return res.status(400).json({ error: 'opponentId required' });
  if (opponentId === req.user.id) return res.status(400).json({ error: 'Cannot challenge yourself' });
  if (![15, 30, 45, 60, 90].includes(Number(durationMinutes))) {
    return res.status(400).json({ error: 'Duration must be 15, 30, 45, 60, or 90 minutes' });
  }

  try {
    // Verify they are friends
    const friendCheck = await query(
      `SELECT id FROM friendships
       WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
       AND status = 'accepted'`,
      [req.user.id, opponentId]
    );
    if (!friendCheck.rows.length) {
      return res.status(403).json({ error: 'You can only challenge friends' });
    }

    // Check no active challenge between these two
    const activeCheck = await query(
      `SELECT id FROM challenges
       WHERE ((challenger_id = $1 AND opponent_id = $2) OR (challenger_id = $2 AND opponent_id = $1))
       AND status IN ('pending', 'active')`,
      [req.user.id, opponentId]
    );
    if (activeCheck.rows.length) {
      return res.status(409).json({ error: 'A challenge between you is already active or pending' });
    }

    const result = await query(
      `INSERT INTO challenges (challenger_id, opponent_id, duration_minutes)
       VALUES ($1, $2, $3) RETURNING id`,
      [req.user.id, opponentId, durationMinutes]
    );
    const challengeId = result.rows[0].id;

    // Fetch challenger info to notify opponent
    const meRes = await query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const me = meRes.rows[0];

    // Notify the opponent in real-time
    notifyUser(opponentId, 'challenge:invited', {
      challengeId,
      challengerUsername: me.username,
      durationMinutes,
    });

    res.status(201).json({ challengeId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// POST /challenges/:id/accept — opponent accepts the challenge
router.post('/:id/accept', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM challenges WHERE id = $1 AND opponent_id = $2 AND status = 'pending'`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Challenge not found or already accepted' });

    const ch = result.rows[0];

    // Start immediately upon acceptance
    const now = new Date();
    const endsAt = new Date(now.getTime() + ch.duration_minutes * 60 * 1000);

    await query(
      `UPDATE challenges SET status = 'active', started_at = $1, ends_at = $2 WHERE id = $3`,
      [now, endsAt, ch.id]
    );

    // Notify both players
    notifyUser(ch.challenger_id, 'challenge:started', { challengeId: ch.id, endsAt });
    notifyUser(ch.opponent_id,   'challenge:started', { challengeId: ch.id, endsAt });

    res.json({ challengeId: ch.id, endsAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept challenge' });
  }
});

// POST /challenges/:id/cancel — challenger cancels before acceptance
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `UPDATE challenges SET status = 'cancelled'
       WHERE id = $1 AND challenger_id = $2 AND status = 'pending'
       RETURNING opponent_id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Challenge not found' });
    notifyUser(result.rows[0].opponent_id, 'challenge:cancelled', { challengeId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel challenge' });
  }
});

// POST /challenges/finalize — internal: resolve expired challenges (called by activity end or cron)
// This checks if the challenge timer has expired and sets a winner
export async function finalizeExpiredChallenges() {
  try {
    const expired = await query(
      `SELECT * FROM challenges WHERE status = 'active' AND ends_at <= NOW()`,
      []
    );
    for (const ch of expired.rows) {
      let winnerId = null;
      if (ch.challenger_hexes > ch.opponent_hexes) winnerId = ch.challenger_id;
      else if (ch.opponent_hexes > ch.challenger_hexes) winnerId = ch.opponent_id;
      // else tie — no winner

      await query(
        `UPDATE challenges SET status = 'completed', winner_id = $1 WHERE id = $2`,
        [winnerId, ch.id]
      );

      const payload = {
        challengeId: ch.id,
        winnerId,
        challengerHexes: ch.challenger_hexes,
        opponentHexes: ch.opponent_hexes,
      };
      notifyUser(ch.challenger_id, 'challenge:ended', payload);
      notifyUser(ch.opponent_id,   'challenge:ended', payload);

      // Feed event for the winner
      if (winnerId) {
        await query(
          `INSERT INTO feed_events (user_id, event_type, metadata) VALUES ($1, 'challenge_won', $2)`,
          [winnerId, JSON.stringify({ challengeId: ch.id, hexes: Math.max(ch.challenger_hexes, ch.opponent_hexes) })]
        );
      }
    }
    return expired.rows.length;
  } catch (err) {
    console.error('finalizeExpiredChallenges error', err);
    return 0;
  }
}

export default router;
