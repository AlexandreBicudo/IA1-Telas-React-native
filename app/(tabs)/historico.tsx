import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GSpacing, GShadow, brandFont, type Palette } from '@/constants/gourmet-theme';
import { AccentBar, ScreenGradient } from '@/components/ui-gourmet';
import { SkeletonBookingCard } from '@/components/skeleton';
import { NotificationBell } from '@/components/NotificationBell';
import { useColors } from '@/components/theme-context';
import { getMyBookings, type BookingListItem } from '@/services/bookingService';
import { getMyAccount } from '@/services/profileService';

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type HistoryFilter = 'all' | 'concluido' | 'cancelado';
type MainTab = 'cliente' | 'chef';

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'concluido', label: 'Concluídos' },
  { key: 'cancelado', label: 'Cancelados' },
];

export default function HistoricoScreen() {
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [clientItems, setClientItems] = useState<BookingListItem[]>([]);
  const [chefItems, setChefItems] = useState<BookingListItem[]>([]);
  const [isChef, setIsChef] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [mainTab, setMainTab] = useState<MainTab>('cliente');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getMyBookings(), getMyAccount()]).then(([bookings, account]) => {
      const past = bookings.asClient.filter((b) => b.status === 'concluido' || b.status === 'cancelado');
      const executed = bookings.asChef.filter((b) => b.status === 'concluido');
      setClientItems(past);
      setChefItems(executed);
      setIsChef(account?.hasChefProfile ?? false);
      setLoading(false);
    });
  }, []);

  useFocusEffect(load);

  // ─── Cliente tab ───
  const clientFiltered = filter === 'all' ? clientItems : clientItems.filter((b) => b.status === filter);
  const totalSpent = clientItems.filter((b) => b.status === 'concluido').reduce((s, b) => s + b.totalPrice, 0);
  const completedCount = clientItems.filter((b) => b.status === 'concluido').length;

  // ─── Chef tab ───
  const totalEarned = chefItems.reduce((s, b) => s + b.totalPrice, 0);

  return (
    <ScreenGradient>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Histórico</Text>
            <Text style={styles.subtitle}>
              {mainTab === 'cliente' ? 'Serviços que você contratou' : 'Serviços que você executou'}
            </Text>
          </View>
          <NotificationBell />
        </View>

        {/* Tab switcher — só aparece para chefs */}
        {isChef && (
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, mainTab === 'cliente' && styles.tabBtnActive]}
              onPress={() => setMainTab('cliente')}
              activeOpacity={0.8}
            >
              <FontAwesome name="shopping-bag" size={13} color={mainTab === 'cliente' ? c.onPrimary : c.muted} />
              <Text style={[styles.tabBtnText, mainTab === 'cliente' && { color: c.onPrimary }]}>Contratei</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, mainTab === 'chef' && styles.tabBtnActiveGreen]}
              onPress={() => setMainTab('chef')}
              activeOpacity={0.8}
            >
              <FontAwesome name="cutlery" size={13} color={mainTab === 'chef' ? '#fff' : c.muted} />
              <Text style={[styles.tabBtnText, mainTab === 'chef' && { color: '#fff' }]}>Executei</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ════════ TAB CLIENTE ════════ */}
        {mainTab === 'cliente' && (
          <>
            {!loading && clientItems.length > 0 && (
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderColor: c.success + '40' }]}>
                  <FontAwesome name="check-circle" size={16} color={c.success} />
                  <Text style={styles.summaryValue}>{completedCount}</Text>
                  <Text style={styles.summaryLabel}>Concluídos</Text>
                </View>
                <View style={[styles.summaryCard, { borderColor: c.primary + '40', flex: 2 }]}>
                  <FontAwesome name="money" size={16} color={c.primary} />
                  <Text style={[styles.summaryValue, { color: c.primary }]}>R$ {fmtBRL(totalSpent)}</Text>
                  <Text style={styles.summaryLabel}>Total investido</Text>
                </View>
                <View style={[styles.summaryCard, { borderColor: c.danger + '40' }]}>
                  <FontAwesome name="times-circle" size={16} color={c.danger} />
                  <Text style={styles.summaryValue}>{clientItems.length - completedCount}</Text>
                  <Text style={styles.summaryLabel}>Cancelados</Text>
                </View>
              </View>
            )}

            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                  onPress={() => setFilter(f.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, filter === f.key && { color: c.onPrimary }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              [1, 2, 3].map((n) => <SkeletonBookingCard key={n} />)
            ) : clientFiltered.length === 0 ? (
              <EmptyState
                icon="history" styles={styles} c={c}
                title={clientItems.length === 0 ? 'Nenhum serviço no histórico' : `Nenhum serviço ${filter === 'concluido' ? 'concluído' : 'cancelado'}`}
                sub={clientItems.length === 0 ? 'Seus serviços contratados e concluídos aparecerão aqui.' : 'Tente outro filtro acima.'}
                ctaLabel={clientItems.length === 0 ? 'Encontrar um chef' : undefined}
                onCta={() => router.push('/catalogo' as any as Href)}
              />
            ) : (
              clientFiltered.map((b) => (
                <HistoryCard
                  key={b.id} booking={b} c={c} styles={styles} mode="client"
                  onPress={() => router.push({ pathname: '/agendamento/[id]', params: { id: b.id, role: 'client' } } as any as Href)}
                  onAction={() => router.push({ pathname: '/chef/[id]', params: { id: b.chefId } } as any as Href)}
                  actionLabel="Remarcar este chef"
                />
              ))
            )}
          </>
        )}

        {/* ════════ TAB CHEF ════════ */}
        {mainTab === 'chef' && (
          <>
            {!loading && (
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderColor: c.success + '40', flex: 2 }]}>
                  <FontAwesome name="dollar" size={16} color={c.success} />
                  <Text style={[styles.summaryValue, { color: c.success }]}>R$ {fmtBRL(totalEarned)}</Text>
                  <Text style={styles.summaryLabel}>Total recebido</Text>
                </View>
                <View style={[styles.summaryCard, { borderColor: c.primary + '40' }]}>
                  <FontAwesome name="check-circle" size={16} color={c.primary} />
                  <Text style={styles.summaryValue}>{chefItems.length}</Text>
                  <Text style={styles.summaryLabel}>Executados</Text>
                </View>
              </View>
            )}

            {loading ? (
              [1, 2].map((n) => <SkeletonBookingCard key={n} />)
            ) : chefItems.length === 0 ? (
              <EmptyState
                icon="cutlery" styles={styles} c={c}
                title="Nenhum serviço executado"
                sub="Quando você concluir um serviço como chef, ele aparecerá aqui com o valor recebido."
              />
            ) : (
              chefItems.map((b) => (
                <HistoryCard
                  key={b.id} booking={b} c={c} styles={styles} mode="chef"
                  onPress={() => router.push({ pathname: '/agendamento/[id]', params: { id: b.id, role: 'chef' } } as any as Href)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </ScreenGradient>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ icon, styles, c, title, sub, ctaLabel, onCta }: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  styles: ReturnType<typeof makeStyles>;
  c: Palette;
  title: string; sub: string;
  ctaLabel?: string; onCta?: () => void;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <FontAwesome name={icon} size={28} color={c.hint} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
      {ctaLabel && onCta && (
        <TouchableOpacity style={styles.ctaBtn} onPress={onCta}>
          <Text style={styles.ctaBtnText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Card de histórico ────────────────────────────────────────────────────────

function HistoryCard({ booking, c, styles, mode, onPress, onAction, actionLabel }: {
  booking: BookingListItem; c: Palette;
  styles: ReturnType<typeof makeStyles>;
  mode: 'client' | 'chef';
  onPress: () => void;
  onAction?: () => void;
  actionLabel?: string;
}) {
  const isConcluido = booking.status === 'concluido';
  const statusColor = isConcluido ? c.success : c.danger;
  const stripColor = mode === 'chef' ? c.success : statusColor;
  const displayName = mode === 'chef' ? booking.clientName : booking.chefName;

  return (
    <TouchableOpacity style={[styles.card, GShadow]} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.cardStrip, { backgroundColor: stripColor }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHead}>
          {booking.counterpartAvatarUrl ? (
            <Image source={{ uri: booking.counterpartAvatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: stripColor + '22' }]}>
              <Text style={[styles.avatarText, { color: stripColor }]}>{getInitials(displayName)}</Text>
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.chefName}>{displayName}</Text>
            <Text style={styles.chefHead} numberOfLines={1}>{booking.address.split(',')[0]}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.price, { color: mode === 'chef' ? c.success : (isConcluido ? c.primary : c.muted) }]}>
              {mode === 'chef' ? '+' : ''}R$ {booking.totalPrice.toFixed(0)}
            </Text>
            {mode === 'client' && (
              <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {isConcluido ? 'Concluído' : 'Cancelado'}
                </Text>
              </View>
            )}
            {mode === 'chef' && (
              <View style={[styles.statusPill, { backgroundColor: c.success + '20' }]}>
                <Text style={[styles.statusText, { color: c.success }]}>Executado</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.chips}>
          <View style={styles.chip}>
            <FontAwesome name="calendar-o" size={11} color={c.hint} />
            <Text style={styles.chipText}>{formatDate(booking.eventDate)}</Text>
          </View>
          <View style={styles.chip}>
            <FontAwesome name="users" size={11} color={c.hint} />
            <Text style={styles.chipText}>{booking.guestsCount} pess.</Text>
          </View>
        </View>

        {isConcluido && mode === 'client' && onAction && actionLabel && (
          <TouchableOpacity style={styles.rebookBtn} onPress={onAction} activeOpacity={0.8}>
            <FontAwesome name="refresh" size={12} color={c.primary} />
            <Text style={styles.rebookText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 48 },
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
    title: { fontSize: 26, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    subtitle: { fontSize: 13, color: c.muted, marginTop: 4 },

    // Tab switcher
    tabRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    tabBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      height: 44, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.card,
    },
    tabBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    tabBtnActiveGreen: { backgroundColor: c.success, borderColor: c.success },
    tabBtnText: { fontSize: 14, fontWeight: '700', color: c.muted },

    // Resumo
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    summaryCard: {
      flex: 1, alignItems: 'center', gap: 4,
      backgroundColor: c.surface, borderWidth: 1,
      borderRadius: GSpacing.radius, paddingVertical: 14,
    },
    summaryValue: { fontSize: 18, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    summaryLabel: { fontSize: 11, color: c.muted, fontWeight: '600' },

    // Filtros
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    filterChip: {
      borderWidth: 1, borderColor: c.border, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 8, backgroundColor: c.card,
    },
    filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterText: { fontSize: 13, color: c.muted, fontWeight: '600' },

    // Card
    card: {
      flexDirection: 'row',
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: GSpacing.radius, marginBottom: 12, overflow: 'hidden',
    },
    cardStrip: { width: 4 },
    cardBody: { flex: 1, padding: 14 },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarFallback: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 14, fontWeight: '700', fontFamily: brandFont },
    cardInfo: { flex: 1 },
    chefName: { fontSize: 15, fontWeight: '700', color: c.cream },
    chefHead: { fontSize: 12, color: c.muted, marginTop: 2 },
    cardRight: { alignItems: 'flex-end', gap: 4 },
    price: { fontSize: 17, fontWeight: '700', fontFamily: brandFont },
    statusPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '600' },

    chips: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.card, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
    chipText: { fontSize: 12, color: c.muted },

    rebookBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      borderWidth: 1, borderColor: c.primary + '60', borderRadius: 8,
      paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start',
    },
    rebookText: { fontSize: 13, color: c.primary, fontWeight: '600' },

    // Empty
    emptyWrap: { alignItems: 'center', marginTop: 48, gap: 14, paddingHorizontal: 12 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: c.cream, textAlign: 'center' },
    emptySub: { fontSize: 13, color: c.muted, textAlign: 'center', lineHeight: 20 },
    ctaBtn: { backgroundColor: c.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, marginTop: 4 },
    ctaBtnText: { fontSize: 14, fontWeight: '700', color: '#000' },
  });
