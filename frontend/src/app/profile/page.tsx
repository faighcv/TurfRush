'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/UI/Navbar';
import Avatar from '@/components/UI/Avatar';
import { usersApi, socialApi } from '@/lib/api';
import {
  Settings, LogOut, UserPlus, Users, Search, Check, X,
  Map, Footprints, Flame, Calendar, Trophy
} from 'lucide-react';
import clsx from 'clsx';

function formatDist(m: number) {
  if (!m) return '0 m';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function timeAgo(date: string) {
  if (!date) return '';
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { token, user, logout, updateUser } = useAuthStore();
  const [friends, setFriends] = useState<any[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [addStatus, setAddStatus] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'friends'|'add'>('friends');

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    socialApi.friends().then(setFriends);
  }, [token, router]);

  const handleSearch = async (q: string) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await socialApi.search(q);
    setSearchResults(res);
  };

  const sendRequest = async (username: string) => {
    try {
      await socialApi.sendRequest(username);
      setAddStatus(s => ({ ...s, [username]: 'sent' }));
    } catch {
      setAddStatus(s => ({ ...s, [username]: 'error' }));
    }
  };

  const acceptFriend = async (friendshipId: string) => {
    await socialApi.acceptRequest(friendshipId);
    const updated = await socialApi.friends();
    setFriends(updated);
  };

  if (!token || !user) return null;

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pendingIncoming = friends.filter(f => f.status === 'pending' && f.direction === 'incoming');

  return (
    <div className="min-h-screen bg-turf-bg pb-20">
      {/* Profile header */}
      <div className="px-4 pt-12 pb-6">
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <Avatar username={user.username} color={user.avatar_color} size={64} />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-white">{user.username}</h1>
              {user.bio && <p className="text-slate-400 text-sm mt-0.5">{user.bio}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar size={11} />
                  Joined {timeAgo(user.created_at || '')}
                </span>
              </div>
            </div>
            <button
              onClick={() => { logout(); router.replace('/login'); }}
              className="text-slate-500 hover:text-turf-red transition-colors p-1"
            >
              <LogOut size={18} />
            </button>
          </div>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-turf-border pt-4">
            <div className="text-center">
              <div className="text-lg font-black text-turf-accent stat-number">{user.total_hexes}</div>
              <div className="text-[10px] text-slate-400 uppercase">Zones</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-turf-green stat-number">{formatDist(user.total_distance_m)}</div>
              <div className="text-[10px] text-slate-400 uppercase">Distance</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-turf-orange stat-number">{user.current_streak}</div>
              <div className="text-[10px] text-slate-400 uppercase">Streak</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-turf-gold stat-number">{user.rank_score}</div>
              <div className="text-[10px] text-slate-400 uppercase">Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending requests */}
      {pendingIncoming.length > 0 && (
        <div className="px-4 mb-4">
          <h2 className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-semibold">
            Friend Requests ({pendingIncoming.length})
          </h2>
          {pendingIncoming.map(f => (
            <div key={f.id} className="card p-3 flex items-center gap-3 mb-2">
              <Avatar username={f.username} color={f.avatar_color} size={38} />
              <div className="flex-1">
                <p className="font-bold text-white text-sm">{f.username}</p>
                <p className="text-xs text-slate-400">{f.total_hexes} zones</p>
              </div>
              <button
                onClick={() => acceptFriend(f.id)}
                className="w-8 h-8 rounded-lg bg-turf-green/20 border border-turf-green/30 text-turf-green flex items-center justify-center"
              >
                <Check size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Friends / Add tabs */}
      <div className="px-4">
        <div className="flex gap-1 bg-turf-card border border-turf-border p-1 rounded-xl mb-4">
          <button
            onClick={() => setTab('friends')}
            className={clsx(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5',
              tab === 'friends' ? 'bg-turf-accent text-turf-bg' : 'text-slate-400'
            )}
          >
            <Users size={14} />
            Friends ({acceptedFriends.length})
          </button>
          <button
            onClick={() => setTab('add')}
            className={clsx(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5',
              tab === 'add' ? 'bg-turf-accent text-turf-bg' : 'text-slate-400'
            )}
          >
            <UserPlus size={14} />
            Add
          </button>
        </div>

        {tab === 'friends' ? (
          <div className="space-y-2">
            {acceptedFriends.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users size={36} className="mx-auto mb-2 opacity-30" />
                <p>No friends yet.<br/>Add someone to compete!</p>
              </div>
            ) : (
              acceptedFriends.map(f => (
                <div key={f.id} className="card p-3 flex items-center gap-3">
                  <Avatar username={f.username} color={f.avatar_color} size={42} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{f.username}</p>
                    <p className="text-xs text-slate-400">{f.total_hexes} zones</p>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-sm font-black stat-number"
                      style={{ color: f.avatar_color }}
                    >
                      {f.total_hexes}
                    </div>
                    <div className="text-xs text-slate-500">zones</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQ}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by username..."
                className="w-full bg-turf-card border border-turf-border rounded-xl pl-9 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-turf-accent/70"
              />
            </div>
            <div className="space-y-2">
              {searchResults.map(u => (
                <div key={u.id} className="card p-3 flex items-center gap-3">
                  <Avatar username={u.username} color={u.avatar_color} size={42} />
                  <div className="flex-1">
                    <p className="font-bold text-white">{u.username}</p>
                    <p className="text-xs text-slate-400">{u.total_hexes} zones owned</p>
                  </div>
                  <button
                    onClick={() => sendRequest(u.username)}
                    disabled={!!addStatus[u.username]}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      addStatus[u.username] === 'sent'
                        ? 'bg-turf-green/20 text-turf-green border border-turf-green/30'
                        : addStatus[u.username] === 'error'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-turf-accent/20 text-turf-accent border border-turf-accent/30 hover:bg-turf-accent/30'
                    )}
                  >
                    {addStatus[u.username] === 'sent' ? 'Sent!' :
                     addStatus[u.username] === 'error' ? 'Error' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
