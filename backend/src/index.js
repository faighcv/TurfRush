import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { initSocket } from './socket/index.js';
import { runMigrations } from './db/migrate.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import territoryRoutes from './routes/territory.js';
import activityRoutes from './routes/activity.js';
import leaderboardRoutes from './routes/leaderboard.js';
import socialRoutes from './routes/social.js';
import challengeRoutes from './routes/challenges.js';

const app = express();
const server = http.createServer(app);

// Socket.io
initSocket(server);

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/territory', territoryRoutes);
app.use('/activity', activityRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/social', socialRoutes);
app.use('/challenges', challengeRoutes);

// Health check
app.get('/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// 404
app.use((_, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
runMigrations().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TurfRush backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Migration failed, aborting start:', err);
  process.exit(1);
});
