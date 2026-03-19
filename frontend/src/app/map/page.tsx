'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/UI/Navbar';
import ActivityTracker from '@/components/ActivityTracker';
import { Locate } from 'lucide-react';
import { useMapStore } from '@/lib/store';

// MapLibre needs browser APIs — disable SSR
const MapView = dynamic(() => import('@/components/Map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-turf-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-turf-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const router = useRouter();
  const token = useAuthStore(s => s.token);
  const user  = useAuthStore(s => s.user);
  const { setUserLocation } = useMapStore();

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  const centerOnMe = () => {
    navigator.geolocation?.getCurrentPosition(pos => {
      setUserLocation([pos.coords.longitude, pos.coords.latitude]);
    });
  };

  if (!token) return null;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-turf-bg">
      {/* Map fills entire screen */}
      <MapView className="absolute inset-0 w-full h-full" />

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="px-4 pt-safe pt-4 flex items-center justify-between">
          <div className="card px-3 py-2 pointer-events-auto">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: user?.avatar_color, boxShadow: `0 0 8px ${user?.avatar_color}` }}
              />
              <span className="text-sm font-bold text-white">{user?.username}</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {user?.total_hexes} zones owned
            </div>
          </div>

          <button
            onClick={centerOnMe}
            className="card p-2.5 pointer-events-auto hover:border-turf-accent/50 transition-colors"
          >
            <Locate size={18} className="text-slate-300" />
          </button>
        </div>
      </div>

      {/* Activity tracker (bottom center, above nav) */}
      <ActivityTracker />

      {/* Bottom Nav */}
      <Navbar />
    </div>
  );
}
