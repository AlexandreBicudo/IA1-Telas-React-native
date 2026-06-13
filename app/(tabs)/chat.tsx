import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import { GColors, GSpacing, brandFont } from '@/constants/gourmet-theme';

/**
 * Placeholder do Chat interno (Fase 3 — Supabase Realtime).
 * Mantém a identidade visual e a navegação por tabs completa.
 */
export default function ChatScreen() {
  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={GColors.dark} />
      <View style={styles.content}>
        <FontAwesome name="comments" size={42} color={GColors.primary} />
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.subtitle}>
          Conversas entre clientes e chefs para alinhar cardápios e detalhes.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>EM BREVE</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: GColors.dark,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: GSpacing.screen,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: GColors.cream,
    fontFamily: brandFont,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: GColors.muted,
    textAlign: 'center',
  },
  badge: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: GColors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    color: GColors.primary,
    letterSpacing: 2,
    fontWeight: '600',
  },
});
