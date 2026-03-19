import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/store';
import { usersApi, socialApi, activityApi } from '@/lib/api';
import StatCard from '@/components/UI/StatCard';
import Avatar from '@/components/UI/Avatar';
import { C } from '@/lib/colors';

function fmtDist(m: number) {
  if (!m) return '0 m';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
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

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [stats, setStats]         = useState<any>(null);
  const [feed, setFeed]           = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      usersApi.stats().then(setStats),
      socialApi.feed().then(setFeed),
      activityApi.recent().then(setActivities),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Avatar username={user?.username || 'U'} color={user?.avatar_color || C.accent} size={52} />
          <View>
            <Text style={styles.greeting}>Hey, {user?.username} 👋</Text>
            <Text style={styles.subGreeting}>Your conquest summary</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Today */}
            <Text style={styles.sectionTitle}>TODAY</Text>
            <View style={styles.row}>
              <StatCard label="Zones" value={stats?.today_hexes || 0} color={C.accent} />
              <View style={{ width: 10 }} />
              <StatCard label="Distance" value={fmtDist(stats?.today_distance || 0)} color={C.green} />
            </View>

            {/* All time */}
            <Text style={styles.sectionTitle}>ALL TIME</Text>
            <View style={styles.row}>
              <StatCard label="Total Zones"  value={user?.total_hexes || 0}                  color={C.purple} />
              <View style={{ width: 10 }} />
              <StatCard label="Distance"     value={fmtDist(user?.total_distance_m || 0)}    color={C.gold} />
            </View>
            <View style={[styles.row, { marginTop: 10 }]}>
              <StatCard label="Streak"       value={`${user?.current_streak || 0}d`}         color={C.orange} />
              <View style={{ width: 10 }} />
              <StatCard label="Rank Score"   value={user?.rank_score || 0}                   color={C.red} />
            </View>

            {/* Recent sessions */}
            {activities.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>RECENT SESSIONS</Text>
                {activities.slice(0, 4).map(act => (
                  <View key={act.id} style={styles.actRow}>
                    <View style={styles.actIcon}><Text style={{ fontSize: 18 }}>🏃</Text></View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.actDist}>{fmtDist(act.distance_m)}</Text>
                        <Text style={[styles.actBadge, { backgroundColor: C.green + '25', color: C.green }]}>
                          +{act.hexes_captured} zones
                        </Text>
                        {act.hexes_stolen > 0 && (
                          <Text style={[styles.actBadge, { backgroundColor: C.red + '25', color: C.red }]}>
                            +{act.hexes_stolen} stolen
                          </Text>
                        )}
                      </View>
                      <Text style={styles.actTime}>{timeAgo(act.started_at)}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Feed */}
            {feed.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>CITY ACTIVITY</Text>
                {feed.slice(0, 8).map(ev => (
                  <View key={ev.id} style={styles.feedRow}>
                    <Avatar username={ev.username} color={ev.avatar_color} size={38} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.feedText}>
                        <Text style={{ color: C.text, fontWeight: '700' }}>{ev.username}</Text>
                        {' '}{feedText(ev)}
                      </Text>
                      <Text style={styles.feedTime}>{timeAgo(ev.created_at)}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
            <View style={{ height: 20 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28, marginTop: 8 },
  greeting: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  subGreeting: { color: C.textMuted, fontSize: 13, marginTop: 2 },
  sectionTitle: {
    color: C.textDim, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, marginBottom: 10, marginTop: 24,
  },
  row: { flexDirection: 'row' },
  actRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 12, marginBottom: 8,
  },
  actIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.accent + '15', alignItems: 'center', justifyContent: 'center',
  },
  actDist: { color: C.text, fontWeight: '700', fontSize: 14 },
  actBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actTime: { color: C.textDim, fontSize: 12, marginTop: 2 },
  feedRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 12, marginBottom: 8,
  },
  feedText: { color: C.textMuted, fontSize: 13, lineHeight: 18 },
  feedTime: { color: C.textDim, fontSize: 11, marginTop: 3 },
});
