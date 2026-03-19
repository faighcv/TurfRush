import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../db/index.js';

const router = Router();

const PLAYER_COLORS = ['#00D4FF', '#39FF14', '#FF073A', '#BF00FF', '#FFD700', '#FF6B35', '#FF69B4', '#00FFD1'];

router.post('/register',
  body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password } = req.body;
    try {
      const exists = await query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );
      if (exists.rows.length) {
        return res.status(409).json({ error: 'Username or email already taken' });
      }

      const hash = await bcrypt.hash(password, 12);
      const color = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];

      const result = await query(
        `INSERT INTO users (username, email, password_hash, avatar_color)
         VALUES ($1, $2, $3, $4) RETURNING id, username, email, avatar_color, created_at`,
        [username, email, hash, color]
      );
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.status(201).json({ token, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const result = await query(
        `SELECT id, username, email, password_hash, avatar_color, total_hexes, total_distance_m, rank_score, current_streak
         FROM users WHERE email = $1`,
        [email]
      );
      const user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const { password_hash: _, ...safeUser } = user;
      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      // Update last_active
      await query('UPDATE users SET last_active = NOW() WHERE id = $1', [user.id]);

      res.json({ token, user: safeUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

export default router;
