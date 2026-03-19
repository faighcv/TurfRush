/**
 * Seed TurfRush with demo users and territory claims
 * Centered around downtown Montreal for a realistic demo
 */
import { query } from './index.js';
import bcrypt from 'bcryptjs';
import { latLngToCell, gridDisk } from 'h3-js';
import dotenv from 'dotenv';
dotenv.config();

// Montreal downtown center
const CENTER_LAT = 45.5017;
const CENTER_LNG = -73.5673;
const H3_RES = 10;

const DEMO_USERS = [
  { username: 'faig',     email: 'faig@demo.com',   password: 'demo1234', color: '#00D4FF', bio: 'I own this city 🏙️' },
  { username: 'alex',     email: 'alex@demo.com',   password: 'demo1234', color: '#39FF14', bio: 'Runner & conqueror' },
  { username: 'maya',     email: 'maya@demo.com',   password: 'demo1234', color: '#FF073A', bio: 'Fast feet 🏃‍♀️' },
  { username: 'jordan',   email: 'jordan@demo.com', password: 'demo1234', color: '#BF00FF', bio: 'Bike gang' },
  { username: 'priya',    email: 'priya@demo.com',  password: 'demo1234', color: '#FFD700', bio: 'Morning warrior' },
];

// Offsets for territory clusters per user (in degrees lat/lng)
const TERRITORY_OFFSETS = [
  { latOff: 0,      lngOff: 0,      radius: 4 },  // faig: center
  { latOff: 0.008,  lngOff: 0.015,  radius: 3 },  // alex: northeast
  { latOff: -0.010, lngOff: 0.005,  radius: 3 },  // maya: south
  { latOff: 0.005,  lngOff: -0.018, radius: 3 },  // jordan: west
  { latOff: -0.006, lngOff: -0.012, radius: 3 },  // priya: southwest
];

async function seed() {
  console.log('🌱 Seeding TurfRush database...\n');

  // Clear existing demo data
  await query(`DELETE FROM feed_events`);
  await query(`DELETE FROM gps_points`);
  await query(`DELETE FROM activities`);
  await query(`DELETE FROM hex_ownership`);
  await query(`DELETE FROM friendships`);
  await query(`DELETE FROM leaderboard_cache`);
  await query(`DELETE FROM users WHERE email LIKE '%@demo.com'`);

  // Create users
  const createdUsers = [];
  for (const u of DEMO_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    const res = await query(
      `INSERT INTO users (username, email, password_hash, avatar_color, bio, current_streak, longest_streak)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [u.username, u.email, hash, u.color, u.bio, Math.floor(Math.random() * 15), Math.floor(Math.random() * 30)]
    );
    createdUsers.push({ ...u, id: res.rows[0].id });
    console.log(`  ✅ Created user: ${u.username}`);
  }

  // Claim territory for each user
  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];
    const offset = TERRITORY_OFFSETS[i];
    const centerHex = latLngToCell(CENTER_LAT + offset.latOff, CENTER_LNG + offset.lngOff, H3_RES);
    const claimedHexes = gridDisk(centerHex, offset.radius);

    let hexCount = 0;
    for (const hexId of claimedHexes) {
      const daysAgo = Math.floor(Math.random() * 7);
      const capturedAt = new Date(Date.now() - daysAgo * 86400000);
      try {
        await query(
          `INSERT INTO hex_ownership (hex_id, owner_id, captured_at, last_activity, capture_count)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (hex_id) DO NOTHING`,
          [hexId, user.id, capturedAt, capturedAt, Math.floor(Math.random() * 5) + 1]
        );
        hexCount++;
      } catch (_) { /* conflict - already owned by another user */ }
    }
    console.log(`  🗺️  ${user.username}: claimed ${hexCount} hexes`);

    // Create sample activities
    const activityDist = 2000 + Math.random() * 5000;
    const actRes = await query(
      `INSERT INTO activities (user_id, started_at, ended_at, distance_m, hexes_captured, is_valid)
       VALUES ($1, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', $2, $3, true) RETURNING id`,
      [user.id, activityDist, hexCount]
    );

    // Update user stats
    await query(
      `UPDATE users SET total_hexes = $1, total_distance_m = $2, rank_score = $3 WHERE id = $4`,
      [hexCount, activityDist * 3, hexCount * 10, user.id]
    );
  }

  // Create friendships (faig friends with everyone)
  const faig = createdUsers[0];
  for (let i = 1; i < createdUsers.length; i++) {
    await query(
      `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, 'accepted')`,
      [faig.id, createdUsers[i].id]
    );
  }
  // alex and maya are friends too
  await query(
    `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, 'accepted')`,
    [createdUsers[1].id, createdUsers[2].id]
  );
  console.log(`\n  👥 Created friendships`);

  // Create feed events
  const eventTemplates = [
    { type: 'captured', userIdx: 0, meta: { hexes: 12, zone: 'Downtown' } },
    { type: 'stolen',   userIdx: 0, meta: { hexes: 3, from: 'alex', zone: 'Old Port' } },
    { type: 'rank_up',  userIdx: 1, meta: { new_rank: 2 } },
    { type: 'captured', userIdx: 2, meta: { hexes: 8, zone: 'Plateau' } },
    { type: 'streak',   userIdx: 3, meta: { days: 7 } },
    { type: 'captured', userIdx: 4, meta: { hexes: 5, zone: 'Mile End' } },
    { type: 'stolen',   userIdx: 1, meta: { hexes: 2, from: 'maya', zone: 'McGill' } },
  ];
  for (const ev of eventTemplates) {
    await query(
      `INSERT INTO feed_events (user_id, event_type, metadata, created_at)
       VALUES ($1, $2, $3, NOW() - (random() * INTERVAL '48 hours'))`,
      [createdUsers[ev.userIdx].id, ev.type, JSON.stringify(ev.meta)]
    );
  }
  console.log(`  📢 Created feed events`);

  // Build leaderboard cache
  for (let i = 0; i < createdUsers.length; i++) {
    const u = createdUsers[i];
    const res = await query(`SELECT total_hexes, total_distance_m FROM users WHERE id = $1`, [u.id]);
    const { total_hexes, total_distance_m } = res.rows[0];
    await query(
      `INSERT INTO leaderboard_cache (user_id, city_rank, hex_count, weekly_hexes, weekly_distance_m)
       VALUES ($1, $2, $3, $4, $5)`,
      [u.id, i + 1, total_hexes, Math.floor(total_hexes * 0.4), total_distance_m * 0.5]
    );
  }
  console.log(`  🏆 Built leaderboard cache\n`);

  console.log('✅ Seed complete!');
  console.log('\n📋 Demo login credentials:');
  for (const u of DEMO_USERS) {
    console.log(`   ${u.username} / demo1234  (${u.color})`);
  }
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
