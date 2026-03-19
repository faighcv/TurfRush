import { View, Text, StyleSheet } from 'react-native';

interface Props {
  username: string;
  color: string;
  size?: number;
}

export default function Avatar({ username, color, size = 40 }: Props) {
  return (
    <View style={[styles.circle, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + '30',
      borderColor: color + '80',
      shadowColor: color,
    }]}>
      <Text style={[styles.letter, { fontSize: size * 0.4, color }]}>
        {username[0].toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  letter: {
    fontWeight: '800',
  },
});
