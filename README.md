<div align="center">

<img src="https://img.shields.io/badge/TurfRush-Own%20Your%20City-00D4FF?style=for-the-badge&logo=mapbox&logoColor=white" alt="TurfRush" />

# ⚡ TurfRush

### Own your city, block by block.

**TurfRush** is a mobile-first territory conquest game powered by real-world movement.
Walk, run, or bike to claim hexagonal zones on a live city map —
then compete with friends to dominate every block.

<br/>

[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)

<br/>

[**🚀 Quick Start**](#-quick-start) · [**🗺️ How It Works**](#%EF%B8%8F-how-it-works) · [**🛠️ Stack**](#%EF%B8%8F-tech-stack) · [**🔌 API**](#-api-reference) · [**🗺 Roadmap**](#-roadmap)

</div>

---

## 🎮 What Is TurfRush?

Inspired by **Slither.io** — but in the real world.

Every time you go outside, you're painting the city with your color. Walk your dog, run your morning route, bike to work — every step claims territory. Come back and your zones are still there. Until someone else steals them.

```
🚶 You walk through a block  →  🟦 It turns your color
🏃 You re-enter your zone    →  💪 It gets stronger
👟 Enemy enters your zone x2 →  🔴 They steal it
😴 You ghost for 7 days      →  ⬛ It fades away
```

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🗺️ Live Territory Map
Real city map with hexagonal grid overlay. Every hex that belongs to someone glows in their color. Zoom in to see street-level battles.

</td>
<td width="50%">

### 📍 GPS Activity Tracking
Start a session, go outside. Your path is recorded and converted to territory in real time. Stop and your conquests are saved forever.

</td>
</tr>
<tr>
<td width="50%">

### 🏆 Leaderboards
City-wide top 50, friends ranking, and weekly captures. Climb the ranks. Defend your spot.

</td>
<td width="50%">

### 👥 Social & Feed
Add friends, see their territory on the map in their color, get live updates like *"Alex just stole 3 of your zones."*

</td>
</tr>
<tr>
<td width="50%">

### 🛡️ Anti-Cheat
Speed cap, teleport detection, and GPS noise filtering. No driving. No spoofing. Real movement only.

</td>
<td width="50%">

### 🔥 Streaks & Stats
Daily distance, zones captured today, all-time territory, streak counter. Every session adds to your legacy.

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| 🖥️ **Frontend** | Next.js 14 + Tailwind CSS | Mobile-first PWA, zero config, deploys anywhere |
| 🗺️ **Map** | MapLibre GL JS + OpenStreetMap | Free tiles, no API key, WebGL-accelerated |
| 🔷 **Hexagons** | Uber H3 (Resolution 10) | ~57m hexagons — perfect walking scale |
| ⚙️ **Backend** | Node.js + Express | Simple, fast, battle-tested |
| 📡 **Real-time** | Socket.io | Territory updates broadcast live to all viewers |
| 🗃️ **Database** | PostgreSQL | Reliable, JSONB metadata, easy to extend |
| 🔐 **Auth** | JWT + bcrypt | Stateless, secure |
| 🐳 **Local Dev** | Docker Compose | One command spins up the whole DB |

---

## 🗺️ How It Works

### Territory System

TurfRush divides the entire world into **H3 hexagons at resolution 10** — each about 57 meters across. That's the size of half a city block. Perfect for walking.

```
🟦 Unclaimed hex      →  Walk through it  →  ✅ Instantly yours
🟦 Your hex           →  Walk through it  →  💪 Strengthened
🟥 Enemy hex          →  Enter it twice   →  🔄 You steal it
⬛ Any hex (7+ days)  →  No activity      →  🌑 Decays to unclaimed
```

### Anti-Cheat Rules

| Rule | Threshold | Action |
|------|-----------|--------|
| 🚗 Max speed | 8 m/s ≈ 29 km/h | Points above this are rejected |
| 🚀 Teleport detection | > 150m in < 3s | Flagged and discarded |
| 📍 GPS noise | < 2m between points | Skipped silently |
| 📊 Minimum session | 3 valid points | Session must have real movement |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Docker** + Docker Compose

### 1. Clone & enter

```bash
git clone https://github.com/faighcv/TurfRush.git
cd TurfRush
```

### 2. Start the database

```bash
docker-compose up -d
```

> Waits ~10 seconds for PostgreSQL to be ready. Schema is auto-applied on first run.

### 3. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed   # 🌱 creates 5 demo users + Montreal territory
npm run dev    # 🚀 http://localhost:4000
```

### 4. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev    # 🌐 http://localhost:3000
```

### 5. Open it

Go to **[http://localhost:3000](http://localhost:3000)** — you'll land on the login screen.

---

## 🧪 Demo Accounts

All demo accounts use password: **`demo1234`**

| Player | Email | Color | Territory |
|--------|-------|-------|-----------|
| **faig** | faig@demo.com | 🔵 Cyan | Downtown center |
| **alex** | alex@demo.com | 🟢 Neon green | Northeast |
| **maya** | maya@demo.com | 🔴 Red | South |
| **jordan** | jordan@demo.com | 🟣 Purple | West |
| **priya** | priya@demo.com | 🟡 Gold | Southwest |

> All 5 players have territory around downtown **Montreal** pre-seeded. Sign in as `faig` and explore the map to see the city carved up between them.

---

## 📁 Project Structure

```
TurfRush/
│
├── 🐳 docker-compose.yml        PostgreSQL (one command)
│
├── ⚙️  backend/
│   └── src/
│       ├── routes/              auth · territory · activity · leaderboard · social
│       ├── services/            territoryEngine.js · anticheat.js
│       ├── socket/              Socket.io real-time broadcasts
│       ├── middleware/          JWT auth guard
│       └── db/                 schema.sql · seed.js · pg pool
│
└── 🖥️  frontend/
    └── src/
        ├── app/                 map · dashboard · leaderboard · profile · login · signup
        ├── components/
        │   ├── Map/             MapView.tsx (MapLibre + H3 territory layer)
        │   ├── ActivityTracker/ GPS tracking + live session HUD
        │   └── UI/              Avatar · StatCard · Navbar
        └── lib/                 api.ts · store.ts (Zustand) · socket.ts
```

---

## 🔌 API Reference

<details>
<summary><strong>Authentication</strong></summary>

```http
POST /auth/register   { username, email, password }
POST /auth/login      { email, password }  →  { token, user }
```
</details>

<details>
<summary><strong>Territory</strong></summary>

```http
GET /territory/viewport?minLat=&minLng=&maxLat=&maxLng=
  →  GeoJSON FeatureCollection of all claimed hexes

GET /territory/mine
  →  All hexes owned by the current user
```
</details>

<details>
<summary><strong>Activity (GPS Sessions)</strong></summary>

```http
POST /activity/start
  →  { activityId }

POST /activity/:id/points   { points: [{lat, lng, timestamp}] }
  →  { accepted, distanceM, captured, stolen, warnings }

POST /activity/:id/end
  →  Session summary
```
</details>

<details>
<summary><strong>Leaderboard</strong></summary>

```http
GET /leaderboard/city      Top 50 players by total hexes
GET /leaderboard/friends   Friends + self, ranked
GET /leaderboard/weekly    Top captures this week
```
</details>

<details>
<summary><strong>Social</strong></summary>

```http
GET  /social/feed                  Activity feed (self + friends)
GET  /social/friends               Your friends list
POST /social/friends/request       { username }  →  send request
POST /social/friends/:id/accept    Accept incoming request
GET  /social/search?q=             Search users by username
```
</details>

---

## 🗺 Roadmap

| Priority | Feature | Description |
|----------|---------|-------------|
| 🔥 High | **Simulate Walk** | Click a route on the map to demo territory capture without going outside |
| 🔥 High | **Heatmap Layer** | Activity density overlay on the city map |
| ⚡ Medium | **Daily Missions** | "Capture 5 new zones before noon" |
| ⚡ Medium | **Badges & Achievements** | Streaks, district conquest, distance milestones |
| ⚡ Medium | **Push Notifications** | "Alex just stole 3 of your zones!" |
| 🌱 Future | **Clan / Team Mode** | Shared territory with team colors |
| 🌱 Future | **Zone Defense** | Spend score to fortify key hexes |
| 🌱 Future | **City Districts** | Named neighborhoods with their own leaderboards |
| 🌱 Future | **React Native** | Native iOS/Android for App Store release |
| 🌱 Future | **Session Replay** | Animated playback of a capture session |

---

<div align="center">

Built with ⚡ · Inspired by Slither.io, Fog of World & Strava

</div>
