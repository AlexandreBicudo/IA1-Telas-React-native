import { FontAwesome } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GSpacing, brandFont, type Palette } from '@/constants/gourmet-theme';
import { ScreenGradient } from '@/components/ui-gourmet';
import { useColors } from '@/components/theme-context';

export default function ChatScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <ScreenGradient>
      <View style={styles.content}>
        <FontAwesome name="comments" size={42} color={c.primary} />
        <Text style={styles.title}>Chat</Text>
        <Text style={styles.subtitle}>Conversas entre clientes e chefs para alinhar cardápios e detalhes.</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>EM BREVE</Text>
        </View>
      </View>
    </ScreenGradient>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: GSpacing.screen, gap: 12 },
    title: { fontSize: 24, fontWeight: '700', color: c.cream, fontFamily: brandFont, marginTop: 8 },
    subtitle: { fontSize: 14, color: c.muted, textAlign: 'center' },
    badge: { marginTop: 12, borderWidth: 1, borderColor: c.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    badgeText: { fontSize: 11, color: c.primary, letterSpacing: 2, fontWeight: '600' },
  });
