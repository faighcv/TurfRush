import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { leaderboardApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Avatar from '@/components/UI/Avatar';
import { C } from '@/lib/colors';

type Tab = 'city' | 'friends' | 'weekly';

function fmtDist(m: number) {
  if (!m) return '—';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const { user } = useAuthStore();
  const [tab, setTab]     = useState<Tab>('city');
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetch = tab === 'city' ? leaderboardApi.city() :
                  tab === 'friends' ? leaderboardApi.friends() :
                  leaderboardApi.weekly();
    fetch.then(setData).finally(() => setLoading(false));
  }, [tab]);

  const leaders = Array.isArray(data) ? data : (data?.leaders || []);
  const myRank  = data?.myRank;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🏆 Leaderboard</Text>
          {myRank ? <Text style={styles.myRank}>You're #{myRank} in the city</Text> : null}
        </View>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        {(['city', 'friends', 'weekly'] as Tab[]).map(t => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {/* Podium top 3 */}
          {leaders.length >= 3 && (
            <View style={styles.podium}>
              <PodiumItem rank={2} entry={leaders[1]} />
              <PodiumItem rank={1} entry={leaders[0]} large />
              <PodiumItem rank={3} entry={leaders[2]} />
            </View>
          )}

          {/* Rest */}
          {leaders.slice(3).map((entry: any, i: number) => {
            const isMe = entry.id === user?.id;
            return (
              <View key={entry.id} style={[styles.row, isMe && styles.rowMe]}>
                <Text style={styles.rankNum}>#{i + 4}</Text>
                <Avatar username={entry.username} color={entry.avatar_color} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, isMe && { color: C.accent }]}>
                    {entry.username}{isMe ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.rowSub}>
                    {tab === 'weekly'
                      ? `${entry.weekly_hexes || 0} zones · ${fmtDist(entry.weekly_distance)}`
                      : `${entry.total_hexes || 0} zones · ${fmtDist(entry.total_distance_m)}`
                    }
                  </Text>
                </View>
                <Text style={[styles.hexCount, { color: entry.avatar_color }]}>
                  {tab === 'weekly' ? (entry.weekly_hexes || 0) : (entry.total_hexes || 0)}
                </Text>
              </View>
            );
          })}

          {leaders.length === 0 && (
            <Text style={styles.empty}>No players yet. Be first to conquer!</Text>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PodiumItem({ rank, entry, large }: { rank: number; entry: any; large?: boolean }) {
  const size = large ? 56 : 44;
  return (
    <View style={[styles.podiumItem, large && { marginBottom: 0 }]}>
      <Text style={{ fontSize: large ? 24 : 20 }}>{MEDALS[rank - 1]}</Text>
      <Avatar username={entry.username} color={entry.avatar_color} size={size} />
      <Text style={[styles.podiumName, { color: entry.avatar_color }]} numberOfLines={1}>
        {entry.username}
      </Text>
      <Text style={styles.podiumZones}>{entry.total_hexes || 0} zones</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { padding: 16, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', color: C.text },
  myRank: { color: C.textMuted, fontSize: 13, marginTop: 2 },
  tabs: {
    flexDirection: 'row', margin: 16, marginTop: 12,
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, padding: 4, gap: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: {
    backgroundColor: C.accent,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  tabText: { color: C.textDim, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: C.bg },
  list: { paddingHorizontal: 16 },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 24, paddingTop: 8 },
  podiumItem: { alignItems: 'center', gap: 4, width: 90 },
  podiumName: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  podiumZones: { color: C.textDim, fontSize: 11 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 12, marginBottom: 8,
  },
  rowMe: { borderColor: C.accent + '60', backgroundColor: C.accent + '08' },
  rankNum: { color: C.textDim, fontWeight: '700', fontSize: 13, width: 28, textAlign: 'center' },
  rowName: { color: C.text, fontWeight: '700', fontSize: 14 },
  rowSub: { color: C.textDim, fontSize: 12, marginTop: 2 },
  hexCount: { fontSize: 18, fontWeight: '900' },
  empty: { color: C.textMuted, textAlign: 'center', marginTop: 60, fontSize: 14 },
});
