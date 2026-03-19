import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TerritoryMap from '@/components/Map/TerritoryMap';
import ActivityTracker from '@/components/ActivityTracker';
import { useAuthStore } from '@/lib/store';
import { C } from '@/lib/colors';

export default function MapScreen() {
  const user = useAuthStore(s => s.user);

  return (
    <View style={styles.container}>
      <TerritoryMap />

      {/* Top HUD */}
      <SafeAreaView style={styles.hud} edges={['top']}>
        <View style={styles.hudCard}>
          <View style={[styles.colorDot, { backgroundColor: user?.avatar_color || C.accent, shadowColor: user?.avatar_color || C.accent }]} />
          <View>
            <Text style={styles.hudName}>{user?.username}</Text>
            <Text style={styles.hudSub}>{user?.total_hexes ?? 0} zones owned</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Activity tracker (floating above tab bar) */}
      <ActivityTracker />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hud: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'box-none' },
  hudCard: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    backgroundColor: C.card + 'EE',
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  colorDot: {
    width: 12, height: 12, borderRadius: 6,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6,
    elevation: 4,
  },
  hudName: { color: C.text, fontWeight: '800', fontSize: 14 },
  hudSub: { color: C.textMuted, fontSize: 11, marginTop: 1 },
});
