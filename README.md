# TurfRush

**Own your city, block by block.**

TurfRush is a mobile-first territory conquest game powered by real-world movement. Walk, run, or bike to claim hexagonal zones on a live city map — compete with friends to dominate your neighborhood.

---

## Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | Next.js 14 + Tailwind CSS | Mobile-first PWA, fast dev, easy to demo |
| Map | MapLibre GL JS + OSM | Free tiles, no API key, WebGL-accelerated |
| Hexagons | Uber H3 (res 10, ~57m) | Perfect walking scale, efficient spatial ops |
| Backend | Node.js + Express + Socket.io | Simple, fast, real-time ready |
| Database | PostgreSQL | Reliable, supports JSONB, easy to extend |
| Auth | JWT + bcrypt | Stateless, secure |
| Real-time | Socket.io | Live territory broadcasts |

---

## Architecture

```
TerraRun/
├── backend/          Node.js API + WebSocket server
│   └── src/
│       ├── routes/   REST endpoints (auth, territory, activity, leaderboard, social)
│       ├── services/ Territory engine + anti-cheat
│       ├── socket/   Socket.io real-time layer
│       └── db/       PostgreSQL pool + schema + seed
├── frontend/         Next.js 14 PWA
│   └── src/
│       ├── app/      Pages (map, dashboard, leaderboard, profile, auth)
│       ├── components/ MapView, ActivityTracker, UI atoms
│       └── lib/      API client, Zustand stores, socket
└── docker-compose.yml  PostgreSQL
```

---

## Territory System

- **H3 Resolution 10** — hexagons ~57m across (good walking scale)
- **Claim**: walking through an unclaimed hex instantly claims it
- **Refresh**: re-entering your own hex strengthens it
- **Steal**: entering an enemy hex 2+ times in one session takes it over
- **Decay**: hexes inactive for 7+ days lose ownership (stays dynamic)

## Anti-Cheat

| Rule | Value |
|------|-------|
| Max speed | 8 m/s (~29 km/h) |
| Teleport detection | >150m in <3s = rejected |
| GPS noise | <2m between points = skipped |
| Minimum points | 3 valid points to count |

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- Docker + Docker Compose (for PostgreSQL)

### 2. Start the database

```bash
docker-compose up -d
```

Wait for the health check to pass (~10s).

### 3. Backend setup

```bash
cd backend
cp .env.example .env
npm install
npm run seed      # seeds demo users + territory
npm run dev       # runs on http://localhost:4000
```

### 4. Frontend setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev       # runs on http://localhost:3000
```

### 5. Open the app

Go to `http://localhost:3000` — you'll be redirected to login.

**Demo accounts** (all passwords: `demo1234`):

| Username | Color | Territory |
|----------|-------|-----------|
| faig | Cyan | Downtown center |
| alex | Neon green | Northeast |
| maya | Red | South |
| jordan | Purple | West |
| priya | Gold | Southwest |

---

## Key Endpoints

```
POST /auth/register          — create account
POST /auth/login             — get JWT

GET  /territory/viewport     — GeoJSON hexes in viewport
GET  /territory/mine         — your hexes

POST /activity/start         — begin GPS session
POST /activity/:id/points    — submit GPS batch
POST /activity/:id/end       — end session

GET  /leaderboard/city       — top 50 by total hexes
GET  /leaderboard/friends    — friends + self
GET  /leaderboard/weekly     — this week's top captures

GET  /social/feed            — activity feed
GET  /social/friends         — your friends list
POST /social/friends/request — send friend request
```

---

## Next Steps (Post-MVP)

1. **Heatmap layer** — show activity density as a heat overlay
2. **Daily missions** — "capture 5 new zones before noon"
3. **Badges & achievements** — streaks, city districts, distance milestones
4. **Push notifications** — "Alex just stole 3 of your zones!"
5. **Clan / team mode** — shared territory with team colors
6. **Zone defense** — spend score to "fortify" key hexes
7. **City districts** — name and track famous neighborhoods
8. **React Native app** — native iOS/Android for production
9. **Leaderboard by district** — compete in specific zones
10. **Replay mode** — animated playback of a session's captures

---

## Renaming

To rename from "TurfRush" to something else, replace:
- `TurfRush` in `README.md`, `frontend/src/app/layout.tsx`
- `turftrush-*` in both `package.json` files
- Database name in `docker-compose.yml` and `.env.example`
