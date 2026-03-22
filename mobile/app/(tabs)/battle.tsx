import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { challengeApi, socialApi } from '@/lib/api';
import { useAuthStore, useChallengeStore } from '@/lib/store';
import Avatar from '@/components/UI/Avatar';
import { C } from '@/lib/colors';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  'http://localhost:4000';

const DURATIONS = [15, 30, 45, 60, 90];

function fmtCountdown(ms: number) {
  if (ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Challenge = {
  id: string;
  status: string;
  challenger_id: string;
  opponent_id: string;
  challenger_username: string;
  opponent_username: string;
  challenger_color: string;
  opponent_color: string;
  challenger_hexes: number;
  opponent_hexes: number;
  challenger_distance_m: number;
  opponent_distance_m: number;
  duration_minutes: number;
  started_at: string | null;
  ends_at: string | null;
  winner_id: string | null;
  winner_username: string | null;
};

export default function BattleScreen() {
  const { user, token } = useAuthStore();
  const { active, setActive, updateScore } = useChallengeStore();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [duration, setDuration] = useState(30);
  const [creating, setCreating] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await challengeApi.my();
      setChallenges(data);

      // Restore active challenge if any
      const running = data.find((c: Challenge) => c.status === 'active');
      if (running && user) {
        const isChallenger = running.challenger_id === user.id;
        setActive({
          id: running.id,
          opponentUsername: isChallenger ? running.opponent_username : running.challenger_username,
          opponentColor:    isChallenger ? running.opponent_color    : running.challenger_color,
          endsAt:   running.ends_at!,
          myHexes:  isChallenger ? running.challenger_hexes : running.opponent_hexes,
          opponentHexes: isChallenger ? running.opponent_hexes : running.challenger_hexes,
          isChallenger,
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Socket connection for real-time challenge events
  useEffect(() => {
    if (!token || !user) return;

    const socket = io(BASE_URL, { auth: { userId: user.id, token } });
    socketRef.current = socket;

    socket.on('challenge:invited', ({ challengeId, challengerUsername, durationMinutes }) => {
      Alert.alert(
        '⚔️ Challenge!',
        `${challengerUsername} challenged you to a ${durationMinutes}-min battle!`,
        [
          { text: 'Decline', style: 'destructive' },
          {
            text: 'Accept!', onPress: async () => {
              try {
                await challengeApi.accept(challengeId);
                load();
              } catch (e: any) {
                Alert.alert('Error', e.response?.data?.error || 'Failed to accept');
              }
            }
          },
        ]
      );
    });

    socket.on('challenge:started', ({ challengeId, endsAt }) => {
      load();
    });

    socket.on('challenge:score', ({ challengeId, challengerHexes, opponentHexes }) => {
      if (active?.id === challengeId) {
        const myH  = active.isChallenger ? challengerHexes : opponentHexes;
        const oppH = active.isChallenger ? opponentHexes : challengerHexes;
        updateScore(myH, oppH);
      }
      setChallenges(prev => prev.map(c =>
        c.id === challengeId
          ? { ...c, challenger_hexes: challengerHexes, opponent_hexes: opponentHexes }
          : c
      ));
    });

    socket.on('challenge:ended', ({ challengeId, winnerId, challengerHexes, opponentHexes }) => {
      setActive(null);
      load();
      if (winnerId === user.id) {
        Alert.alert('🏆 You won!', `Final: ${challengerHexes} vs ${opponentHexes} zones`);
      } else if (winnerId) {
        Alert.alert('😤 You lost', `Final: ${challengerHexes} vs ${opponentHexes} zones`);
      } else {
        Alert.alert("🤝 It's a tie!", `Final: ${challengerHexes} vs ${opponentHexes} zones`);
      }
    });

    socket.on('challenge:cancelled', () => { load(); });

    return () => { socket.disconnect(); };
  }, [token, user?.id]);

  // Countdown timer for active challenge
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!active?.endsAt) { setCountdown(0); return; }

    const tick = () => {
      const remaining = new Date(active.endsAt).getTime() - Date.now();
      setCountdown(Math.max(0, remaining));
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active?.endsAt]);

  useEffect(() => { load(); }, []);

  const openCreate = async () => {
    try {
      const f = await socialApi.friends();
      setFriends(f.filter((fr: any) => fr.status === 'accepted'));
      setSelectedFriend(null);
      setDuration(30);
      setShowCreate(true);
    } catch {
      Alert.alert('Error', 'Could not load friends');
    }
  };

  const sendChallenge = async () => {
    if (!selectedFriend) return Alert.alert('Pick a friend first');
    setCreating(true);
    try {
      await challengeApi.create(selectedFriend.id, duration);
      setShowCreate(false);
      Alert.alert('Sent!', `Challenge sent to ${selectedFriend.username}. Waiting for them to accept.`);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to send');
    } finally {
      setCreating(false);
    }
  };

  const pending   = challenges.filter(c => c.status === 'pending');
  const running   = challenges.filter(c => c.status === 'active');
  const completed = challenges.filter(c => c.status === 'completed');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Active challenge HUD */}
      {active && (
        <View style={styles.hud}>
          <View style={styles.hudSide}>
            <Text style={styles.hudLabel}>YOU</Text>
            <Text style={styles.hudScore}>{active.myHexes}</Text>
            <Text style={styles.hudSub}>zones</Text>
          </View>
          <View style={styles.hudCenter}>
            <Text style={styles.hudTimer}>{fmtCountdown(countdown)}</Text>
            <Text style={styles.hudVs}>VS</Text>
          </View>
          <View style={styles.hudSide}>
            <Text style={styles.hudLabel}>{active.opponentUsername.toUpperCase()}</Text>
            <Text style={[styles.hudScore, { color: active.opponentColor }]}>{active.opponentHexes}</Text>
            <Text style={styles.hudSub}>zones</Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>⚔️ Battle</Text>
          <Pressable onPress={openCreate} style={styles.newBtn}>
            <Text style={styles.newBtnText}>+ Challenge</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Active */}
            {running.length > 0 && (
              <>
                <Text style={styles.section}>ACTIVE</Text>
                {running.map(c => <ChallengeRow key={c.id} c={c} userId={user?.id} />)}
              </>
            )}

            {/* Pending */}
            {pending.length > 0 && (
              <>
                <Text style={styles.section}>PENDING</Text>
                {pending.map(c => (
                  <ChallengeRow key={c.id} c={c} userId={user?.id}
                    onAccept={c.opponent_id === user?.id ? async () => {
                      try {
                        await challengeApi.accept(c.id);
                        load();
                      } catch (e: any) {
                        Alert.alert('Error', e.response?.data?.error || 'Failed');
                      }
                    } : undefined}
                    onCancel={c.challenger_id === user?.id ? async () => {
                      try {
                        await challengeApi.cancel(c.id);
                        load();
                      } catch { }
                    } : undefined}
                  />
                ))}
              </>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <>
                <Text style={styles.section}>HISTORY</Text>
                {completed.slice(0, 10).map(c => <ChallengeRow key={c.id} c={c} userId={user?.id} />)}
              </>
            )}

            {challenges.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>⚔️</Text>
                <Text style={styles.emptyTitle}>No battles yet</Text>
                <Text style={styles.emptyText}>Challenge a friend and see who conquers the most zones!</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Create challenge modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Challenge</Text>

            <Text style={styles.fieldLabel}>PICK A FRIEND</Text>
            <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
              {friends.length === 0 && (
                <Text style={styles.emptyText}>Add friends first from the Profile tab.</Text>
              )}
              {friends.map(f => (
                <Pressable
                  key={f.id}
                  onPress={() => setSelectedFriend(f)}
                  style={[styles.friendRow, selectedFriend?.id === f.id && styles.friendRowSelected]}
                >
                  <Avatar username={f.username} color={f.avatar_color} size={36} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.friendName}>{f.username}</Text>
                    <Text style={styles.friendSub}>{f.total_hexes} zones</Text>
                  </View>
                  {selectedFriend?.id === f.id && <Text style={{ color: C.accent }}>✓</Text>}
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>DURATION</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map(d => (
                <Pressable
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[styles.durationBtn, duration === d && styles.durationBtnActive]}
                >
                  <Text style={[styles.durationText, duration === d && styles.durationTextActive]}>
                    {d}m
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowCreate(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={sendChallenge}
                disabled={creating || !selectedFriend}
                style={[styles.sendBtn, (!selectedFriend || creating) && { opacity: 0.5 }]}
              >
                {creating
                  ? <ActivityIndicator color={C.bg} />
                  : <Text style={styles.sendText}>Send ⚔️</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ChallengeRow({ c, userId, onAccept, onCancel }: {
  c: Challenge;
  userId?: string;
  onAccept?: () => void;
  onCancel?: () => void;
}) {
  const isChallenger = c.challenger_id === userId;
  const myHexes  = isChallenger ? c.challenger_hexes : c.opponent_hexes;
  const oppHexes = isChallenger ? c.opponent_hexes : c.challenger_hexes;
  const oppName  = isChallenger ? c.opponent_username : c.challenger_username;
  const oppColor = isChallenger ? c.opponent_color : c.challenger_color;

  const isWin = c.winner_id === userId;
  const isLoss = c.winner_id && c.winner_id !== userId;
  const isTie = c.status === 'completed' && !c.winner_id;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Avatar username={oppName} color={oppColor} size={40} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardOpp}>{oppName}</Text>
          <Text style={styles.cardSub}>{c.duration_minutes} min · {c.status}</Text>
        </View>
        {c.status === 'completed' && (
          <Text style={[styles.badge,
            isWin ? styles.badgeWin : isLoss ? styles.badgeLoss : styles.badgeTie
          ]}>
            {isWin ? '🏆 Win' : isLoss ? '💀 Loss' : '🤝 Tie'}
          </Text>
        )}
        {c.status === 'active' && (
          <Text style={styles.badgeLive}>● LIVE</Text>
        )}
      </View>

      {(c.status === 'active' || c.status === 'completed') && (
        <View style={styles.scoreRow}>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreNum}>{myHexes}</Text>
            <Text style={styles.scoreLabel}>YOUR ZONES</Text>
          </View>
          <Text style={styles.scoreVs}>vs</Text>
          <View style={styles.scoreBlock}>
            <Text style={[styles.scoreNum, { color: oppColor }]}>{oppHexes}</Text>
            <Text style={styles.scoreLabel}>THEIR ZONES</Text>
          </View>
        </View>
      )}

      {(onAccept || onCancel) && (
        <View style={styles.cardActions}>
          {onCancel && (
            <Pressable onPress={onCancel} style={styles.declineBtn}>
              <Text style={styles.declineText}>Cancel</Text>
            </Pressable>
          )}
          {onAccept && (
            <Pressable onPress={onAccept} style={styles.acceptBtn}>
              <Text style={styles.acceptText}>Accept ⚔️</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },

  hud: {
    flexDirection: 'row', backgroundColor: C.accent + '15',
    borderBottomWidth: 1, borderBottomColor: C.accent + '40',
    paddingVertical: 12, paddingHorizontal: 20,
  },
  hudSide: { flex: 1, alignItems: 'center' },
  hudCenter: { alignItems: 'center', paddingHorizontal: 16 },
  hudLabel: { color: C.textDim, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  hudScore: { fontSize: 32, fontWeight: '900', color: C.accent },
  hudSub: { color: C.textDim, fontSize: 10 },
  hudTimer: { fontSize: 22, fontWeight: '900', color: C.text },
  hudVs: { color: C.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: C.text },
  newBtn: {
    backgroundColor: C.accent, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  newBtnText: { color: C.bg, fontWeight: '800', fontSize: 13 },

  section: { color: C.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginTop: 6 },

  card: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1,
    borderColor: C.border, padding: 14, marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardOpp: { color: C.text, fontWeight: '700', fontSize: 15 },
  cardSub: { color: C.textDim, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  badgeWin:  { backgroundColor: '#00D4FF20', color: '#00D4FF' },
  badgeLoss: { backgroundColor: C.red + '20', color: C.red },
  badgeTie:  { backgroundColor: C.textDim + '20', color: C.textDim },
  badgeLive: { color: C.accent, fontWeight: '800', fontSize: 12 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  scoreBlock: { flex: 1, alignItems: 'center' },
  scoreNum: { fontSize: 28, fontWeight: '900', color: C.accent },
  scoreLabel: { color: C.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 2 },
  scoreVs: { color: C.textDim, fontWeight: '700', paddingHorizontal: 10 },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: {
    flex: 1, backgroundColor: C.accent, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  acceptText: { color: C.bg, fontWeight: '800', fontSize: 13 },
  declineBtn: {
    backgroundColor: C.red + '15', borderRadius: 10, borderWidth: 1,
    borderColor: C.red + '40', paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center',
  },
  declineText: { color: C.red, fontWeight: '700', fontSize: 13 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyText: { color: C.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Modal
  modalBg: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: C.text, marginBottom: 20 },
  fieldLabel: { color: C.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 6,
  },
  friendRowSelected: { borderColor: C.accent, backgroundColor: C.accent + '10' },
  friendName: { color: C.text, fontWeight: '700', fontSize: 14 },
  friendSub: { color: C.textDim, fontSize: 12, marginTop: 2 },

  durationRow: { flexDirection: 'row', gap: 8 },
  durationBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  durationBtnActive: { borderColor: C.accent, backgroundColor: C.accent + '15' },
  durationText: { color: C.textDim, fontWeight: '700', fontSize: 13 },
  durationTextActive: { color: C.accent },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelText: { color: C.textMuted, fontWeight: '700', fontSize: 15 },
  sendBtn: {
    flex: 2, backgroundColor: C.accent, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 4,
  },
  sendText: { color: C.bg, fontWeight: '800', fontSize: 15 },
});
