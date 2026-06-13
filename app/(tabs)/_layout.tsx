import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { GColors } from '@/constants/gourmet-theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: GColors.primary,
        tabBarInactiveTintColor: GColors.muted,
        tabBarStyle: {
          backgroundColor: GColors.card,
          borderTopColor: GColors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="catalogo"
        options={{
          title: 'Catálogo',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="search" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="calendar" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="comments" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="user" size={size ?? 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
