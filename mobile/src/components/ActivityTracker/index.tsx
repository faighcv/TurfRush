import { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { activityApi } from '@/lib/api';
import { useActivityStore, useMapStore } from '@/lib/store';
import { C } from '@/lib/colors';

const BATCH_MS = 15_000;

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)}km` : `${Math.round(m)}m`;
}
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function ActivityTracker() {
  const { isTracking, activityId, sessionDistance, sessionHexes, sessionStolen,
          elapsed, startTracking, updateSession, tickElapsed, stopTracking } = useActivityStore();
  const { setUserLocation } = useMapStore();
  const [loading, setLoading] = useState(false);

  const pointsRef  = useRef<Array<{ lat: number; lng: number; timestamp: string }>>([]);
  const subRef     = useRef<Location.LocationSubscription | null>(null);
  const sendRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(async () => {
    if (!activityId || pointsRef.current.length === 0) return;
    const batch = [...pointsRef.current];
    pointsRef.current = [];
    try {
      const res = await activityApi.submitPoints(activityId, batch);
      if (res.distanceM) updateSession(res.distanceM, res.captured || 0, res.stolen || 0);
    } catch (e) {
      console.warn('GPS batch failed', e);
    }
  }, [activityId, updateSession]);

  const start = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'TurfRush needs location access to track your movement.');
      return;
    }
    setLoading(true);
    try {
      const { activityId: id } = await activityApi.start();
      startTracking(id);
      pointsRef.current = [];

      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 3000, distanceInterval: 2 },
        (loc) => {
          const pt = { lat: loc.coords.latitude, lng: loc.coords.longitude, timestamp: new Date().toISOString() };
          pointsRef.current.push(pt);
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      );

      sendRef.current  = setInterval(flush, BATCH_MS);
      timerRef.current = setInterval(tickElapsed, 1000);
    } catch {
      Alert.alert('Error', 'Could not start activity. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const stop = async () => {
    setLoading(true);
    await flush();
    subRef.current?.remove();
    if (sendRef.current)  clearInterval(sendRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (activityId) {
      try { await activityApi.end(activityId); } catch {}
    }
    stopTracking();
    setLoading(false);
  };

  useEffect(() => {
    if (activityId && sendRef.current) {
      clearInterval(sendRef.current);
      sendRef.current = setInterval(flush, BATCH_MS);
    }
  }, [flush, activityId]);

  useEffect(() => () => {
    subRef.current?.remove();
    if (sendRef.current)  clearInterval(sendRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  if (!isTracking) {
    return (
      <View style={styles.startWrap}>
        <Pressable
          onPress={start}
          disabled={loading}
          style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.startText}>{loading ? 'Starting...' : '▶  Start Tracking'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.hudWrap}>
      <View style={styles.hud}>
        {/* Live indicator */}
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{fmtTime(elapsed)}</Text>
            <Text style={styles.statLbl}>TIME</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: C.accent }]}>{fmtDist(sessionDistance)}</Text>
            <Text style={styles.statLbl}>DIST</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: C.green }]}>{sessionHexes}</Text>
            <Text style={styles.statLbl}>ZONES</Text>
          </View>
          {sessionStolen > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.stat}>
                <Text style={[styles.statVal, { color: C.red }]}>{sessionStolen}</Text>
                <Text style={styles.statLbl}>STOLEN</Text>
              </View>
            </>
          )}
        </View>

        {/* Stop */}
        <Pressable
          onPress={stop}
          disabled={loading}
          style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.stopText}>{loading ? '...' : '■'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  startWrap: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
  },
  startBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  startText: {
    color: C.bg,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  hudWrap: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  hud: {
    backgroundColor: C.card + 'F0',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  liveText: {
    color: C.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statVal: {
    color: C.text,
    fontSize: 15,
    fontWeight: '800',
  },
  statLbl: {
    color: C.textDim,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: C.border,
  },
  stopBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.red + '25',
    borderWidth: 1,
    borderColor: C.red + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopText: {
    color: C.red,
    fontSize: 14,
    fontWeight: '800',
  },
});
