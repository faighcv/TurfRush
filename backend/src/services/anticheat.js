/**
 * Anti-cheat validation for GPS tracks
 *
 * Rules:
 * 1. Max sustained speed: 8 m/s (~29 km/h) — allows cycling, blocks driving
 * 2. Teleport detection: >150m jump in <3 seconds → invalid
 * 3. GPS noise filter: points <2m apart are skipped
 * 4. Minimum valid points: at least 3 good points to count the session
 */

const MAX_SPEED_MPS = 8;        // ~29 km/h
const TELEPORT_DIST_M = 150;
const TELEPORT_TIME_S = 3;
const MIN_DIST_M = 2;

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Validate an array of GPS points.
 * @param {Array<{lat, lng, timestamp}>} points
 * @returns {{ valid: Array, invalid: Array, totalDistanceM: number, warnings: string[] }}
 */
export function validateTrack(points) {
  if (!points || points.length < 2) {
    return { valid: [], invalid: points || [], totalDistanceM: 0, warnings: ['Too few points'] };
  }

  // Sort by timestamp
  const sorted = [...points].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const valid = [];
  const invalid = [];
  const warnings = [];
  let totalDistanceM = 0;
  let prev = null;

  for (const pt of sorted) {
    if (!prev) {
      pt.speed_mps = 0;
      pt.is_valid = true;
      valid.push(pt);
      prev = pt;
      continue;
    }

    const distM = haversineMeters(prev.lat, prev.lng, pt.lat, pt.lng);
    const timeDiffS = (new Date(pt.timestamp) - new Date(prev.timestamp)) / 1000;

    // Skip stationary/noise points
    if (distM < MIN_DIST_M) {
      continue;
    }

    // Teleport detection
    if (distM > TELEPORT_DIST_M && timeDiffS < TELEPORT_TIME_S) {
      warnings.push(`Teleport detected: ${distM.toFixed(0)}m in ${timeDiffS.toFixed(1)}s`);
      pt.is_valid = false;
      invalid.push(pt);
      // Don't update prev — wait for next good point
      continue;
    }

    const speedMps = timeDiffS > 0 ? distM / timeDiffS : 0;

    // Speed check
    if (speedMps > MAX_SPEED_MPS) {
      warnings.push(`Speed too high: ${(speedMps * 3.6).toFixed(1)} km/h`);
      pt.is_valid = false;
      invalid.push(pt);
      continue;
    }

    pt.speed_mps = speedMps;
    pt.is_valid = true;
    totalDistanceM += distM;
    valid.push(pt);
    prev = pt;
  }

  return { valid, invalid, totalDistanceM, warnings };
}

export { haversineMeters };
