/**
 * Skeleton loading animado com efeito pulse (Reanimated).
 * Substituem ActivityIndicator em listas enquanto o conteúdo carrega.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { GSpacing, type Palette } from '@/constants/gourmet-theme';
import { useColors } from '@/components/theme-context';

function SkeletonBox({ width, height, radius = 8, style }: { width?: number | string; height: number; radius?: number; style?: object }) {
  const c = useColors();
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 850 }), -1, true);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius: radius, backgroundColor: c.border },
        animStyle,
        style,
      ]}
    />
  );
}

/** Skeleton do card do chef no catálogo. */
export function SkeletonChefCard() {
  const c = useColors();
  return (
    <View style={[skStyles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <SkeletonBox height={160} radius={0} />
      <View style={skStyles.body}>
        <View style={skStyles.row}>
          <SkeletonBox width="55%" height={16} />
          <SkeletonBox width="25%" height={16} />
        </View>
        <SkeletonBox height={12} style={{ marginTop: 10 }} />
        <SkeletonBox width="40%" height={12} style={{ marginTop: 8 }} />
        <View style={[skStyles.row, { marginTop: 12 }]}>
          <SkeletonBox width={70} height={24} radius={20} />
          <SkeletonBox width={70} height={24} radius={20} />
        </View>
      </View>
    </View>
  );
}

/** Skeleton do card de agendamento na agenda. */
export function SkeletonBookingCard() {
  const c = useColors();
  return (
    <View style={[skStyles.bookingCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={skStyles.row}>
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBox width="30%" height={10} />
          <SkeletonBox width="55%" height={18} />
        </View>
        <SkeletonBox width={80} height={26} radius={20} />
      </View>
      <View style={{ gap: 8, marginTop: 14 }}>
        <SkeletonBox width="40%" height={12} />
        <SkeletonBox width="30%" height={12} />
        <SkeletonBox width="65%" height={12} />
      </View>
      <View style={[skStyles.row, { marginTop: 14 }]}>
        <SkeletonBox width={60} height={20} />
        <SkeletonBox width={100} height={34} radius={8} />
      </View>
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    borderRadius: GSpacing.radius,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  bookingCard: {
    borderRadius: GSpacing.radius,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  body: { padding: 14, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
});
