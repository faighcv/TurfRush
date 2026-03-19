'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/UI/Navbar';
import Avatar from '@/components/UI/Avatar';
import { leaderboardApi } from '@/lib/api';
import { Trophy, Medal, TrendingUp, Footprints } from 'lucide-react';
import clsx from 'clsx';

type Tab = 'city' | 'friends' | 'weekly';

function formatDist(m: number) {
  if (!m) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const RANK_LABELS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('city');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
  }, [token, router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const fetcher = tab === 'city' ? leaderboardApi.city() :
                    tab === 'friends' ? leaderboardApi.friends() :
                    leaderboardApi.weekly();
    fetcher.then(setData).finally(() => setLoading(false));
  }, [tab, token]);

  if (!token) return null;

  const leaders = Array.isArray(data) ? data : (data?.leaders || []);
  const myRank   = data?.myRank;

  return (
    <div className="min-h-screen bg-turf-bg pb-20">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Trophy size={28} className="text-turf-gold" />
          <div>
            <h1 className="text-2xl font-black text-white">Leaderboard</h1>
            {myRank && <p className="text-slate-400 text-sm">You're #{myRank} in the city</p>}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-turf-card border border-turf-border p-1 rounded-xl">
          {(['city', 'friends', 'weekly'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize',
                tab === t
                  ? 'bg-turf-accent text-turf-bg shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center pt-20">
          <div className="w-8 h-8 border-2 border-turf-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {/* Top 3 podium */}
          {leaders.length >= 3 && (
            <div className="flex items-end justify-center gap-3 py-4">
              {/* 2nd */}
              <PodiumCard rank={2} entry={leaders[1]} />
              {/* 1st */}
              <PodiumCard rank={1} entry={leaders[0]} large />
              {/* 3rd */}
              <PodiumCard rank={3} entry={leaders[2]} />
            </div>
          )}

          {/* Rest of list */}
          {leaders.slice(3).map((entry: any, i: number) => {
            const isMe = entry.id === user?.id;
            return (
              <div
                key={entry.id}
                className={clsx(
                  'card p-3 flex items-center gap-3 transition-all',
                  isMe && 'border-turf-accent/40 bg-turf-accent/5'
                )}
              >
                <div className="w-8 text-center text-slate-400 font-bold text-sm stat-number">
                  #{i + 4}
                </div>
                <Avatar username={entry.username} color={entry.avatar_color} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={clsx('font-bold text-sm', isMe ? 'text-turf-accent' : 'text-white')}>
                      {entry.username}
                      {isMe && <span className="text-xs ml-1 text-turf-accent/70">(you)</span>}
                    </span>
                    {entry.current_streak > 4 && (
                      <span className="text-xs text-turf-orange">🔥 {entry.current_streak}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {tab === 'weekly'
                      ? `${entry.weekly_hexes || 0} zones · ${formatDist(entry.weekly_distance)}`
                      : `${entry.total_hexes || 0} zones · ${formatDist(entry.total_distance_m)}`
                    }
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold stat-number" style={{ color: entry.avatar_color }}>
                    {tab === 'weekly' ? entry.weekly_hexes || 0 : entry.total_hexes || 0}
                  </div>
                  <div className="text-xs text-slate-500">zones</div>
                </div>
              </div>
            );
          })}

          {leaders.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p>No players yet.<br/>Be the first to conquer!</p>
            </div>
          )}
        </div>
      )}

      <Navbar />
    </div>
  );
}

function PodiumCard({ rank, entry, large }: { rank: number; entry: any; large?: boolean }) {
  const heights = { 1: 'h-20', 2: 'h-14', 3: 'h-10' };
  return (
    <div className={clsx('flex flex-col items-center gap-1', large ? 'scale-110' : '')}>
      <span className="text-lg">{RANK_LABELS[rank - 1]}</span>
      <Avatar username={entry.username} color={entry.avatar_color} size={large ? 52 : 42} />
      <span className="text-xs font-bold text-white max-w-[60px] truncate">{entry.username}</span>
      <span className="text-xs text-slate-400 stat-number">{entry.total_hexes || 0}</span>
      <div
        className={clsx('w-16 rounded-t-lg', heights[rank as 1|2|3])}
        style={{ background: `${entry.avatar_color}30`, border: `1px solid ${entry.avatar_color}50` }}
      />
    </div>
  );
}
