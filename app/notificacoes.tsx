import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { GSpacing, GShadow, brandFont, type Palette } from '@/constants/gourmet-theme';
import { ScreenGradient } from '@/components/ui-gourmet';
import { useColors } from '@/components/theme-context';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type AppNotification,
  type NotifType,
} from '@/services/notificationCenterService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function notifIcon(type: NotifType): { icon: React.ComponentProps<typeof FontAwesome>['name']; color: (c: Palette) => string } {
  switch (type) {
    case 'pedido_recebido':   return { icon: 'calendar-plus-o', color: (c) => c.warning };
    case 'pedido_aceito':     return { icon: 'check-circle',    color: (c) => c.success };
    case 'pedido_cancelado':  return { icon: 'times-circle',    color: (c) => c.danger  };
    case 'servico_concluido': return { icon: 'trophy',          color: (c) => c.primary };
    case 'nova_avaliacao':    return { icon: 'star',            color: (c) => c.primary };
    default:                  return { icon: 'bell',            color: (c) => c.muted   };
  }
}

const INCOMING_TYPES: NotifType[] = ['pedido_recebido'];

interface NotifGroup {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  accentColor: (c: Palette) => string;
  items: AppNotification[];
}

function buildGroups(notifs: AppNotification[]): NotifGroup[] {
  const incoming = notifs.filter((n) => INCOMING_TYPES.includes(n.type));
  const updates  = notifs.filter((n) => !INCOMING_TYPES.includes(n.type));
  const groups: NotifGroup[] = [];
  if (incoming.length > 0) {
    groups.push({
      key: 'incoming',
      label: 'NOVOS CONTRATOS',
      icon: 'calendar-plus-o',
      accentColor: (c) => c.warning,
      items: incoming,
    });
  }
  if (updates.length > 0) {
    groups.push({
      key: 'updates',
      label: 'ATUALIZAÇÕES',
      icon: 'bell',
      accentColor: (c) => c.primary,
      items: updates,
    });
  }
  return groups;
}

// ─── Card de notificação ──────────────────────────────────────────────────────

function NotifCard({
  n, c, styles, onPress, onDelete,
}: {
  n: AppNotification;
  c: Palette;
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { icon, color } = notifIcon(n.type);
  const col = color(c);
  return (
    <TouchableOpacity
      style={[styles.notifCard, !n.read && styles.notifCardUnread, GShadow]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.notifIcon, { backgroundColor: col + '20' }]}>
        <FontAwesome name={icon} size={18} color={col} />
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifTitleRow}>
          <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text>
          {!n.read && <View style={[styles.unreadDot, { backgroundColor: col }]} />}
        </View>
        <Text style={styles.notifBody} numberOfLines={2}>{n.body}</Text>
        <Text style={styles.notifTime}>{timeAgo(n.createdAt)}</Text>
      </View>
      {n.bookingId && (
        <FontAwesome name="chevron-right" size={13} color={c.hint} style={{ marginRight: 4 }} />
      )}
      <TouchableOpacity onPress={onDelete} hitSlop={10} style={styles.deleteBtn}>
        <FontAwesome name="trash-o" size={16} color={c.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

export default function NotificacoesScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getMyNotifications().then((data) => {
      setNotifs(data);
      setLoading(false);
    });
  }, []);

  useFocusEffect(load);

  const handleTap = async (n: AppNotification) => {
    if (!n.read) {
      await markAsRead(n.id);
      setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.bookingId) {
      // pedido_recebido e pedido_cancelado (pelo cliente) chegam no sino do chef
      const isChefNotif = n.type === 'pedido_recebido' || (n.type === 'pedido_cancelado' && n.title === 'Contrato cancelado');
      router.push({ pathname: '/agendamento/[id]', params: { id: n.bookingId, role: isChefNotif ? 'chef' : 'client' } } as any as Href);
    }
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifs((prev) => prev.map((x) => ({ ...x, read: true })));
  };

  const handleDelete = async (id: string) => {
    setNotifs((prev) => prev.filter((x) => x.id !== id));
    await deleteNotification(id);
  };

  const unreadCount = notifs.filter((n) => !n.read).length;
  const groups = useMemo(() => buildGroups(notifs), [notifs]);

  return (
    <ScreenGradient>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <FontAwesome name="chevron-left" size={18} color={c.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAll} hitSlop={10}>
            <Text style={styles.markAllText}>Marcar todas</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator color={c.primary} /></View>
        ) : notifs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <FontAwesome name="bell-o" size={30} color={c.hint} />
            </View>
            <Text style={styles.emptyTitle}>Tudo em dia!</Text>
            <Text style={styles.emptySub}>Quando chegar um novo contrato ou houver atualização nos seus agendamentos, aparecerá aqui.</Text>
          </View>
        ) : (
          groups.map((group, gi) => (
            <View key={group.key} style={gi > 0 ? { marginTop: 24 } : undefined}>
              {/* Cabeçalho do grupo */}
              <View style={styles.groupHeader}>
                <View style={[styles.groupIconWrap, { backgroundColor: group.accentColor(c) + '20' }]}>
                  <FontAwesome name={group.icon} size={12} color={group.accentColor(c)} />
                </View>
                <Text style={[styles.groupLabel, { color: group.accentColor(c) }]}>{group.label}</Text>
                <View style={[styles.groupCount, { backgroundColor: group.accentColor(c) + '20' }]}>
                  <Text style={[styles.groupCountText, { color: group.accentColor(c) }]}>{group.items.length}</Text>
                </View>
                {group.items.some((n) => !n.read) && (
                  <View style={[styles.groupUnreadDot, { backgroundColor: group.accentColor(c) }]} />
                )}
              </View>

              {/* Cards do grupo */}
              <View style={styles.groupItems}>
                {group.items.map((n) => (
                  <NotifCard key={n.id} n={n} c={c} styles={styles} onPress={() => handleTap(n)} onDelete={() => handleDelete(n.id)} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenGradient>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: GSpacing.screen, paddingTop: 16, paddingBottom: 12,
    },
    backBtn: { width: 36 },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    markAllText: { fontSize: 12, color: c.primary, fontWeight: '600', width: 72, textAlign: 'right' },

    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 48, paddingTop: 8 },
    loadingWrap: { alignItems: 'center', marginTop: 80 },

    // Grupo
    groupHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginBottom: 12,
    },
    groupIconWrap: {
      width: 26, height: 26, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center',
    },
    groupLabel: {
      flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    },
    groupCount: {
      borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
    },
    groupCountText: { fontSize: 11, fontWeight: '700' },
    groupUnreadDot: {
      width: 7, height: 7, borderRadius: 4,
    },
    groupItems: { gap: 8 },

    // Cards
    notifCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: GSpacing.radius, padding: 14,
    },
    notifCardUnread: { borderColor: c.primary + '50', backgroundColor: c.primary + '08' },
    notifIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    notifContent: { flex: 1, gap: 3 },
    notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    notifTitle: { fontSize: 14, fontWeight: '700', color: c.cream, flex: 1 },
    unreadDot: { width: 8, height: 8, borderRadius: 4 },
    notifBody: { fontSize: 13, color: c.muted, lineHeight: 18 },
    notifTime: { fontSize: 11, color: c.hint, marginTop: 2 },
    deleteBtn: { padding: 6, marginLeft: 2 },

    // Empty
    emptyWrap: { alignItems: 'center', marginTop: 80, gap: 14, paddingHorizontal: 20 },
    emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: c.cream, textAlign: 'center' },
    emptySub: { fontSize: 13, color: c.muted, textAlign: 'center', lineHeight: 20 },
  });
