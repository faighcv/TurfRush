'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Play, Square, Navigation } from 'lucide-react';
import { activityApi } from '@/lib/api';
import { useActivityStore, useMapStore, useAuthStore } from '@/lib/store';
import clsx from 'clsx';

const BATCH_INTERVAL_MS = 15_000;  // send GPS batch every 15s
const GPS_INTERVAL_MS  = 3_000;   // capture GPS every 3s

function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

export default function ActivityTracker() {
  const { isTracking, activityId, sessionDistance, sessionHexes, sessionStolen,
          startTracking, addPoint, updateSession, stopTracking } = useActivityStore();
  const { setUserLocation } = useMapStore();
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const pointsBufferRef = useRef<Array<{ lat: number; lng: number; timestamp: string }>>([]);
  const gpsIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Flush buffered points to backend
  const flushPoints = useCallback(async () => {
    if (!activityId || pointsBufferRef.current.length === 0) return;
    const batch = [...pointsBufferRef.current];
    pointsBufferRef.current = [];
    try {
      const result = await activityApi.submitPoints(activityId, batch);
      if (result.distanceM) updateSession(result.distanceM, result.captured || 0, result.stolen || 0);
    } catch (e) {
      console.error('Failed to send GPS batch', e);
    }
  }, [activityId, updateSession]);

  const startActivity = async () => {
    setError(null);
    if (!navigator.geolocation) {
      setError('GPS not available on this device');
      return;
    }
    setLoading(true);
    try {
      const { activityId: id } = await activityApi.start();
      startTracking(id);
      pointsBufferRef.current = [];
      setElapsed(0);

      // Watch GPS
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: new Date().toISOString() };
          pointsBufferRef.current.push(pt);
          addPoint(pt.lat, pt.lng);
          setUserLocation([pt.lng, pt.lat]);
        },
        (err) => setError(`GPS error: ${err.message}`),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // Batch send every 15s
      sendIntervalRef.current = setInterval(flushPoints, BATCH_INTERVAL_MS);

      // Elapsed timer
      elapsedIntervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch {
      setError('Could not start activity');
    } finally {
      setLoading(false);
    }
  };

  const stopActivity = async () => {
    setLoading(true);
    try {
      await flushPoints();
      if (activityId) await activityApi.end(activityId);
    } catch (e) {
      console.error(e);
    }
    // Cleanup
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    stopTracking();
    setElapsed(0);
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, []);

  // Update flush callback when activityId changes
  useEffect(() => {
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = setInterval(flushPoints, BATCH_INTERVAL_MS);
    }
  }, [flushPoints]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!isTracking) {
    return (
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30">
        <div className="flex flex-col items-center gap-2">
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs px-3 py-1.5 rounded-lg">
              {error}
            </div>
          )}
          <button
            onClick={startActivity}
            disabled={loading}
            className={clsx(
              'flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all',
              'bg-turf-accent text-turf-bg shadow-[0_0_24px_rgba(0,212,255,0.5)]',
              'hover:scale-105 active:scale-95 disabled:opacity-50'
            )}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-turf-bg border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
            Start Tracking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-20 left-4 right-4 z-30">
      <div className="card p-3 flex items-center gap-3">
        {/* Pulse indicator */}
        <div className="relative shrink-0">
          <div className="w-3 h-3 rounded-full bg-turf-green animate-ping absolute" />
          <div className="w-3 h-3 rounded-full bg-turf-green" />
        </div>

        {/* Stats row */}
        <div className="flex-1 flex gap-4 min-w-0">
          <div className="text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Time</div>
            <div className="text-sm font-bold text-white stat-number">{formatTime(elapsed)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Dist</div>
            <div className="text-sm font-bold text-turf-accent stat-number">{formatDist(sessionDistance)}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Hexes</div>
            <div className="text-sm font-bold text-turf-green stat-number">{sessionHexes}</div>
          </div>
          {sessionStolen > 0 && (
            <div className="text-center">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Stolen</div>
              <div className="text-sm font-bold text-turf-red stat-number">{sessionStolen}</div>
            </div>
          )}
        </div>

        {/* Stop button */}
        <button
          onClick={stopActivity}
          disabled={loading}
          className="shrink-0 w-10 h-10 rounded-xl bg-turf-red/20 border border-turf-red/40 text-turf-red flex items-center justify-center hover:bg-turf-red/30 transition-colors"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-turf-red border-t-transparent rounded-full animate-spin" />
          ) : (
            <Square size={16} fill="currentColor" />
          )}
        </button>
      </div>
    </div>
  );
}
