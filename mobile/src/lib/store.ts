import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    {
      name: 'turf-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

interface ActivityState {
  isTracking: boolean;
  activityId: string | null;
  sessionDistance: number;
  sessionHexes: number;
  sessionStolen: number;
  elapsed: number;
  startTracking: (activityId: string) => void;
  updateSession: (dist: number, hexes: number, stolen: number) => void;
  tickElapsed: () => void;
  stopTracking: () => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  isTracking: false,
  activityId: null,
  sessionDistance: 0,
  sessionHexes: 0,
  sessionStolen: 0,
  elapsed: 0,
  startTracking: (activityId) => set({ isTracking: true, activityId, sessionDistance: 0, sessionHexes: 0, sessionStolen: 0, elapsed: 0 }),
  updateSession: (dist, hexes, stolen) =>
    set(s => ({
      sessionDistance: s.sessionDistance + dist,
      sessionHexes: s.sessionHexes + hexes,
      sessionStolen: s.sessionStolen + stolen,
    })),
  tickElapsed: () => set(s => ({ elapsed: s.elapsed + 1 })),
  stopTracking: () => set({ isTracking: false, activityId: null, elapsed: 0 }),
}));

interface MapState {
  userLocation: { latitude: number; longitude: number } | null;
  setUserLocation: (loc: { latitude: number; longitude: number }) => void;
  territoryRefreshTick: number;
  triggerRefresh: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),
  territoryRefreshTick: 0,
  triggerRefresh: () => set(s => ({ territoryRefreshTick: s.territoryRefreshTick + 1 })),
}));

export interface ActiveChallenge {
  id: string;
  opponentUsername: string;
  opponentColor: string;
  endsAt: string;
  myHexes: number;
  opponentHexes: number;
  isChallenger: boolean;
}

interface ChallengeState {
  active: ActiveChallenge | null;
  setActive: (c: ActiveChallenge | null) => void;
  updateScore: (myHexes: number, opponentHexes: number) => void;
}

export const useChallengeStore = create<ChallengeState>((set) => ({
  active: null,
  setActive: (c) => set({ active: c }),
  updateScore: (myHexes, opponentHexes) =>
    set(s => s.active ? { active: { ...s.active, myHexes, opponentHexes } } : {}),
}));
