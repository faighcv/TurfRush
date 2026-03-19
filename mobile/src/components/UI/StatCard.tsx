import { View, Text, StyleSheet } from 'react-native';
import { C } from '@/lib/colors';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export default function StatCard({ label, value, sub, color = C.accent }: Props) {
  return (
    <View style={[styles.card, { borderColor: color + '30' }]}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <Text style={[styles.label]}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 2,
  },
  bar: {
    width: 24,
    height: 3,
    borderRadius: 2,
    marginBottom: 6,
  },
  label: {
    color: C.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  sub: {
    color: C.textDim,
    fontSize: 11,
    marginTop: 1,
  },
});
