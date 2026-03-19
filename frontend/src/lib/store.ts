import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_color: string;
  bio?: string;
  total_hexes: number;
  total_distance_m: number;
  rank_score: number;
  current_streak: number;
  longest_streak?: number;
  last_active?: string;
  created_at?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      updateUser: (partial) => set(s => ({ user: s.user ? { ...s.user, ...partial } : null })),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'turf-auth' }
  )
);

// Activity tracking state (not persisted)
interface ActivityState {
  isTracking: boolean;
  activityId: string | null;
  currentPoints: Array<{ lat: number; lng: number; timestamp: string }>;
  sessionDistance: number;
  sessionHexes: number;
  sessionStolen: number;
  startTracking: (activityId: string) => void;
  addPoint: (lat: number, lng: number) => void;
  updateSession: (dist: number, hexes: number, stolen: number) => void;
  stopTracking: () => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  isTracking: false,
  activityId: null,
  currentPoints: [],
  sessionDistance: 0,
  sessionHexes: 0,
  sessionStolen: 0,
  startTracking: (activityId) => set({ isTracking: true, activityId, currentPoints: [], sessionDistance: 0, sessionHexes: 0, sessionStolen: 0 }),
  addPoint: (lat, lng) =>
    set(s => ({
      currentPoints: [...s.currentPoints, { lat, lng, timestamp: new Date().toISOString() }],
    })),
  updateSession: (dist, hexes, stolen) =>
    set(s => ({
      sessionDistance: s.sessionDistance + dist,
      sessionHexes: s.sessionHexes + hexes,
      sessionStolen: s.sessionStolen + stolen,
    })),
  stopTracking: () => set({ isTracking: false, activityId: null, currentPoints: [] }),
}));

// Map UI state
interface MapState {
  userLocation: [number, number] | null;
  setUserLocation: (loc: [number, number]) => void;
  territoryRefreshTick: number;
  triggerTerritoryRefresh: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),
  territoryRefreshTick: 0,
  triggerTerritoryRefresh: () => set(s => ({ territoryRefreshTick: s.territoryRefreshTick + 1 })),
}));
