import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/store';
import { socialApi } from '@/lib/api';
import Avatar from '@/components/UI/Avatar';
import { C } from '@/lib/colors';

function fmtDist(m: number) {
  if (!m) return '0 m';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [tab, setTab]             = useState<'friends' | 'add'>('friends');
  const [friends, setFriends]     = useState<any[]>([]);
  const [searchQ, setSearchQ]     = useState('');
  const [results, setResults]     = useState<any[]>([]);
  const [addStatus, setAddStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    socialApi.friends().then(setFriends);
  }, []);

  const search = async (q: string) => {
    setSearchQ(q);
    if (q.length < 2) { setResults([]); return; }
    const r = await socialApi.search(q);
    setResults(r);
  };

  const sendReq = async (username: string) => {
    try {
      await socialApi.sendRequest(username);
      setAddStatus(s => ({ ...s, [username]: 'sent' }));
    } catch {
      setAddStatus(s => ({ ...s, [username]: 'error' }));
    }
  };

  const accept = async (id: string) => {
    await socialApi.acceptRequest(id);
    const updated = await socialApi.friends();
    setFriends(updated);
  };

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const accepted = friends.filter(f => f.status === 'accepted');
  const pending  = friends.filter(f => f.status === 'pending' && f.direction === 'incoming');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <Avatar username={user?.username || 'U'} color={user?.avatar_color || C.accent} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.username}>{user?.username}</Text>
              {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
            </View>
            <Pressable onPress={confirmLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>↩</Text>
            </Pressable>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatPill label="Zones"    value={user?.total_hexes ?? 0}         color={C.accent} />
            <StatPill label="Distance" value={fmtDist(user?.total_distance_m ?? 0)} color={C.green} />
            <StatPill label="Streak"   value={`${user?.current_streak ?? 0}d`} color={C.orange} />
            <StatPill label="Score"    value={user?.rank_score ?? 0}           color={C.gold} />
          </View>
        </View>

        {/* Pending requests */}
        {pending.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>FRIEND REQUESTS ({pending.length})</Text>
            {pending.map(f => (
              <View key={f.id} style={styles.friendRow}>
                <Avatar username={f.username} color={f.avatar_color} size={42} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.friendName}>{f.username}</Text>
                  <Text style={styles.friendSub}>{f.total_hexes} zones</Text>
                </View>
                <Pressable onPress={() => accept(f.id)} style={styles.acceptBtn}>
                  <Text style={styles.acceptText}>✓ Accept</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        {/* Friends / Add tabs */}
        <View style={styles.tabRow}>
          {(['friends', 'add'] as const).map(t => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'friends' ? `Friends (${accepted.length})` : 'Add Friends'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'friends' ? (
          accepted.length === 0 ? (
            <Text style={styles.empty}>No friends yet. Add someone to compete!</Text>
          ) : (
            accepted.map(f => (
              <View key={f.id} style={styles.friendRow}>
                <Avatar username={f.username} color={f.avatar_color} size={44} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.friendName}>{f.username}</Text>
                  <Text style={styles.friendSub}>{f.total_hexes} zones owned</Text>
                </View>
                <Text style={[styles.friendHexes, { color: f.avatar_color }]}>{f.total_hexes}</Text>
              </View>
            ))
          )
        ) : (
          <>
            <TextInput
              style={styles.searchInput}
              value={searchQ}
              onChangeText={search}
              placeholder="Search by username..."
              placeholderTextColor={C.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {results.map(u => (
              <View key={u.id} style={styles.friendRow}>
                <Avatar username={u.username} color={u.avatar_color} size={42} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.friendName}>{u.username}</Text>
                  <Text style={styles.friendSub}>{u.total_hexes} zones owned</Text>
                </View>
                <Pressable
                  onPress={() => sendReq(u.username)}
                  disabled={!!addStatus[u.username]}
                  style={[
                    styles.addBtn,
                    addStatus[u.username] === 'sent' && { backgroundColor: C.green + '25', borderColor: C.green + '60' },
                  ]}
                >
                  <Text style={[styles.addBtnText, addStatus[u.username] === 'sent' && { color: C.green }]}>
                    {addStatus[u.username] === 'sent' ? 'Sent!' : 'Add'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16 },
  profileCard: {
    backgroundColor: C.card, borderRadius: 18, borderWidth: 1,
    borderColor: C.border, padding: 16, marginBottom: 20,
  },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  username: { fontSize: 22, fontWeight: '900', color: C.text },
  bio: { color: C.textMuted, fontSize: 13, marginTop: 3 },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.red + '20', borderWidth: 1, borderColor: C.red + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { color: C.red, fontSize: 18 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 },
  statPill: { alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '900' },
  statLabel: { color: C.textDim, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, marginTop: 2 },
  sectionTitle: { color: C.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  tabRow: {
    flexDirection: 'row', backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, padding: 4, gap: 4, marginBottom: 14,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: C.accent },
  tabText: { color: C.textDim, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: C.bg },
  friendRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 12, marginBottom: 8,
  },
  friendName: { color: C.text, fontWeight: '700', fontSize: 14 },
  friendSub: { color: C.textDim, fontSize: 12, marginTop: 2 },
  friendHexes: { fontSize: 20, fontWeight: '900' },
  acceptBtn: {
    backgroundColor: C.green + '20', borderRadius: 10, borderWidth: 1,
    borderColor: C.green + '50', paddingHorizontal: 12, paddingVertical: 8,
  },
  acceptText: { color: C.green, fontWeight: '700', fontSize: 13 },
  searchInput: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14, color: C.text, fontSize: 15, marginBottom: 12,
  },
  addBtn: {
    backgroundColor: C.accent + '20', borderRadius: 10, borderWidth: 1,
    borderColor: C.accent + '50', paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  empty: { color: C.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
