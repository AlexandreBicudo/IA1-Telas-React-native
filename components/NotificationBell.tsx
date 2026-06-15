import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/components/theme-context';
import { getUnreadCount } from '@/services/notificationCenterService';

export function NotificationBell() {
  const c = useColors();
  const router = useRouter();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    getUnreadCount().then(setCount);
  }, []);

  useFocusEffect(refresh);

  return (
    <TouchableOpacity
      onPress={() => router.push('/notificacoes' as any)}
      hitSlop={12}
      style={styles.wrap}
      activeOpacity={0.7}
    >
      <FontAwesome name="bell-o" size={20} color={c.cream} />
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: c.danger }]}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
