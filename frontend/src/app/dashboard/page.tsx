'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/UI/Navbar';
import StatCard from '@/components/UI/StatCard';
import Avatar from '@/components/UI/Avatar';
import { usersApi, socialApi, activityApi } from '@/lib/api';
import { Map, Footprints, Flame, Trophy, Clock, ChevronRight, TrendingUp, Zap } from 'lucide-react';

function formatDist(m: number) {
  if (!m) return '0 m';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function feedText(ev: any) {
  const m = ev.metadata || {};
  switch (ev.event_type) {
    case 'captured': return `captured ${m.hexes} zone${m.hexes !== 1 ? 's' : ''}${m.zone ? ` in ${m.zone}` : ''}`;
    case 'stolen':   return `stole ${m.hexes} zone${m.hexes !== 1 ? 's' : ''} from ${m.from || 'someone'}`;
    case 'rank_up':  return `climbed to rank #${m.new_rank}!`;
    case 'streak':   return `is on a ${m.days}-day streak!`;
    default:         return ev.event_type;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    Promise.all([
      usersApi.stats().then(setStats),
      socialApi.feed().then(setFeed),
      activityApi.recent().then(setActivities),
    ]).finally(() => setLoading(false));
  }, [token, router]);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-turf-bg pb-20">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <Avatar username={user?.username || 'U'} color={user?.avatar_color || '#00D4FF'} size={48} />
          <div>
            <h1 className="text-2xl font-black text-white">
              Hey, {user?.username}
            </h1>
            <p className="text-slate-400 text-sm">Your conquest summary</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center pt-20">
          <div className="w-8 h-8 border-2 border-turf-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {/* Today's stats */}
          <div>
            <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">Today</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Map}       label="Zones"    value={stats?.today_hexes || 0}               color="#00D4FF" />
              <StatCard icon={Footprints} label="Distance" value={formatDist(stats?.today_distance || 0)} color="#39FF14" />
            </div>
          </div>

          {/* All-time stats */}
          <div>
            <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">All Time</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Zap}    label="Total Zones"  value={user?.total_hexes || 0}                    color="#BF00FF" />
              <StatCard icon={TrendingUp} label="Distance" value={formatDist(user?.total_distance_m || 0)}   color="#FFD700" />
              <StatCard icon={Flame}  label="Streak"       value={`${user?.current_streak || 0} days`}       color="#FF6B35" />
              <StatCard icon={Trophy} label="Rank Score"   value={user?.rank_score || 0}                     color="#FF073A" />
            </div>
          </div>

          {/* Recent activities */}
          {activities.length > 0 && (
            <div>
              <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">Recent Sessions</h2>
              <div className="space-y-2">
                {activities.slice(0, 4).map(act => (
                  <div key={act.id} className="card p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-turf-accent/10 border border-turf-accent/20 flex items-center justify-center">
                      <Clock size={16} className="text-turf-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{formatDist(act.distance_m)}</span>
                        <span className="text-xs text-turf-green">+{act.hexes_captured} zones</span>
                        {act.hexes_stolen > 0 && (
                          <span className="text-xs text-turf-red">+{act.hexes_stolen} stolen</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{timeAgo(act.started_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social feed */}
          {feed.length > 0 && (
            <div>
              <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-semibold">City Activity</h2>
              <div className="space-y-2">
                {feed.slice(0, 8).map(ev => (
                  <div key={ev.id} className="card p-3 flex items-center gap-3">
                    <Avatar username={ev.username} color={ev.avatar_color} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300">
                        <span className="font-bold text-white">{ev.username}</span>{' '}
                        {feedText(ev)}
                      </p>
                      <p className="text-xs text-slate-500">{timeAgo(ev.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Navbar />
    </div>
  );
}
