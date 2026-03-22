import { Tabs } from 'expo-router';
import { C } from '@/lib/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textDim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{ title: 'Map', tabBarIcon: ({ color }) => <TabIcon emoji="🗺️" color={color} /> }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Stats', tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} /> }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ title: 'Ranks', tabBarIcon: ({ color }) => <TabIcon emoji="🏆" color={color} /> }}
      />
      <Tabs.Screen
        name="battle"
        options={{ title: 'Battle', tabBarIcon: ({ color }) => <TabIcon emoji="⚔️" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, opacity: color === C.accent ? 1 : 0.5 }}>{emoji}</Text>;
}
