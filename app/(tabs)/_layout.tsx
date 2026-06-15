import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/components/theme-context';

export default function TabsLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="catalogo"
        options={{ title: 'Catálogo', tabBarIcon: ({ color, size }) => <FontAwesome name="search" size={size ?? 22} color={color} /> }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ title: 'Agenda', tabBarIcon: ({ color, size }) => <FontAwesome name="calendar" size={size ?? 22} color={color} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat', tabBarIcon: ({ color, size }) => <FontAwesome name="comments" size={size ?? 22} color={color} /> }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <FontAwesome name="user" size={size ?? 22} color={color} /> }}
      />
    </Tabs>
  );
}
