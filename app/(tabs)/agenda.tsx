import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { GSpacing, GShadow, brandFont, type Palette } from '@/constants/gourmet-theme';
import { AccentBar, ScreenGradient } from '@/components/ui-gourmet';
import { SkeletonBookingCard } from '@/components/skeleton';
import { useColors } from '@/components/theme-context';
import { getMyBookings, updateBookingStatus, type BookingListItem, type MyBookings } from '@/services/bookingService';
import type { BookingStatus } from '@/types/database';

// ─── Mapa de status ───────────────────────────────────────────────────────────

function statusUi(c: Palette): Record<BookingStatus, { label: string; color: string }> {
  return {
    solicitado:   { label: 'Pendente',     color: c.warning  },
    confirmado:   { label: 'Confirmado',   color: c.success  },
    em_andamento: { label: 'Em andamento', color: c.primary  },
    concluido:    { label: 'Concluído',    color: c.muted    },
    cancelado:    { label: 'Cancelado',    color: c.danger   },
  };
}

// ─── Ordenação e agrupamento ──────────────────────────────────────────────────

const STATUS_ORDER: Record<BookingStatus, number> = {
  solicitado: 0, confirmado: 1, em_andamento: 2, concluido: 3, cancelado: 4,
};

interface BookingGroup {
  key: string;
  title: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  accentColor: (c: Palette) => string;
  statuses: BookingStatus[];
}

const GROUPS: BookingGroup[] = [
  {
    key: 'action',
    title: 'REQUER AÇÃO',
    icon: 'exclamation-circle',
    accentColor: (c) => c.warning,
    statuses: ['solicitado'],
  },
  {
    key: 'active',
    title: 'EM ANDAMENTO',
    icon: 'clock-o',
    accentColor: (c) => c.success,
    statuses: ['confirmado', 'em_andamento'],
  },
  {
    key: 'history',
    title: 'HISTÓRICO',
    icon: 'archive',
    accentColor: (c) => c.hint,
    statuses: ['concluido', 'cancelado'],
  },
];

function sortAndGroup(list: BookingListItem[]): { group: BookingGroup; items: BookingListItem[] }[] {
  const sorted = [...list].sort((a, b) => {
    const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (orderDiff !== 0) return orderDiff;
    return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
  });

  return GROUPS
    .map((group) => ({
      group,
      items: sorted.filter((b) => (group.statuses as string[]).includes(b.status)),
    }))
    .filter((g) => g.items.length > 0);
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

type Tab = 'client' | 'chef';
type DateFilter = 'all' | 'today' | 'week' | 'month';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'all',   label: 'Todos'       },
  { key: 'today', label: 'Hoje'        },
  { key: 'week',  label: 'Esta semana' },
  { key: 'month', label: 'Este mês'    },
];

function applyDateFilter(items: BookingListItem[], filter: DateFilter): BookingListItem[] {
  if (filter === 'all') return items;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return items.filter((b) => {
    const d = new Date(b.eventDate);
    if (filter === 'today')
      return d >= today && d < new Date(today.getTime() + 86_400_000);
    if (filter === 'week')
      return d >= today && d < new Date(today.getTime() + 7 * 86_400_000);
    if (filter === 'month') {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return d >= today && d < nextMonth;
    }
    return true;
  });
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function AgendaScreen() {
  const c = useColors();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(c), [c]);
  const STATUS = useMemo(() => statusUi(c), [c]);

  const [tab, setTab] = useState<Tab>('client');
  const [data, setData] = useState<MyBookings>({ asClient: [], asChef: [] });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const load = useCallback(() => {
    setLoading(true);
    getMyBookings().then((d) => { setData(d); setLoading(false); });
  }, []);

  useFocusEffect(load);

  const act = async (id: string, status: BookingStatus) => {
    const labels: Partial<Record<BookingStatus, string>> = {
      confirmado: 'Aceitar este agendamento?',
      cancelado: tab === 'chef' ? 'Recusar este pedido?' : 'Cancelar este agendamento?',
      concluido: 'Marcar serviço como concluído?',
    };
    Alert.alert(labels[status] ?? 'Confirmar?', undefined, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: status === 'cancelado' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await updateBookingStatus(id, status);
            load();
          } catch {
            Alert.alert('Erro', 'Não foi possível atualizar o agendamento.');
          }
        },
      },
    ]);
  };

  const rawList = tab === 'client' ? data.asClient : data.asChef;
  const list = useMemo(() => {
    let result = applyDateFilter(rawList, dateFilter);
    const q = searchText.trim().toLowerCase();
    if (q) {
      result = result.filter((b) =>
        b.chefName.toLowerCase().includes(q) ||
        b.clientName.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q),
      );
    }
    return result;
  }, [rawList, searchText, dateFilter]);
  const grouped = useMemo(() => sortAndGroup(list), [list]);

  // Count de itens pendentes para os badges das abas
  const pendingClient = data.asClient.filter((b) => b.status === 'solicitado').length;
  const pendingChef   = data.asChef.filter((b) => b.status === 'solicitado').length;

  return (
    <ScreenGradient>
      <AccentBar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Minha agenda</Text>
        <Text style={styles.subtitle}>Serviços contratados e pedidos recebidos.</Text>

        {/* ─── Seletor de aba ─── */}
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segBtn, tab === 'client' && styles.segBtnActive]}
            onPress={() => setTab('client')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segText, tab === 'client' && styles.segTextActive]}>Contratei</Text>
            {pendingClient > 0 && (
              <View style={[styles.badge, tab === 'client' ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={[styles.badgeText, tab === 'client' && { color: '#fff' }]}>{pendingClient}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segBtn, tab === 'chef' && styles.segBtnActive]}
            onPress={() => setTab('chef')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segText, tab === 'chef' && styles.segTextActive]}>Como chef</Text>
            {pendingChef > 0 && (
              <View style={[styles.badge, tab === 'chef' ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={[styles.badgeText, tab === 'chef' && { color: '#fff' }]}>{pendingChef}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── Busca e filtros ─── */}
        <View style={styles.searchRow}>
          <FontAwesome name="search" size={14} color={c.hint} style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou endereço..."
            placeholderTextColor={c.hint}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={10} style={{ marginRight: 12 }}>
              <FontAwesome name="times-circle" size={16} color={c.hint} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}>
          {DATE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, dateFilter === f.key && styles.filterChipActive]}
              onPress={() => setDateFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, dateFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ─── Conteúdo ─── */}
        {loading ? (
          [1, 2, 3].map((n) => <SkeletonBookingCard key={n} />)
        ) : list.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <FontAwesome name={searchText || dateFilter !== 'all' ? 'filter' : 'calendar-o'} size={28} color={c.hint} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchText || dateFilter !== 'all'
                ? 'Nenhum resultado para os filtros'
                : tab === 'client' ? 'Nenhum serviço contratado' : 'Nenhum pedido recebido'}
            </Text>
            <Text style={styles.emptySub}>
              {searchText || dateFilter !== 'all'
                ? 'Tente outro período ou limpe a busca.'
                : tab === 'client'
                  ? 'Encontre um chef no catálogo e faça seu primeiro agendamento.'
                  : 'Quando clientes solicitarem seu serviço, eles aparecerão aqui.'}
            </Text>
          </View>
        ) : (
          grouped.map(({ group, items }) => (
            <View key={group.key}>
              {/* Cabeçalho da seção */}
              <View style={styles.sectionHead}>
                <FontAwesome name={group.icon} size={13} color={group.accentColor(c)} />
                <Text style={[styles.sectionTitle, { color: group.accentColor(c) }]}>
                  {group.title}
                </Text>
                <View style={[styles.sectionBadge, { backgroundColor: group.accentColor(c) + '22' }]}>
                  <Text style={[styles.sectionBadgeText, { color: group.accentColor(c) }]}>
                    {items.length}
                  </Text>
                </View>
              </View>

              {/* Cards */}
              {items.map((b) => {
                const sv = STATUS[b.status];
                const counterpart = tab === 'client' ? b.chefName : b.clientName;
                const roleLabel = tab === 'client' ? 'CHEF' : 'CLIENTE';
                const isHistory = group.key === 'history';

                return (
                  <TouchableOpacity
                    key={b.id}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: '/agendamento/[id]',
                        params: { id: b.id, role: tab === 'client' ? 'client' : 'chef' },
                      } as any as Href)
                    }
                  >
                    <View style={[styles.card, isHistory && styles.cardHistory, GShadow]}>
                      {/* Faixa lateral colorida */}
                      <View style={[styles.cardStrip, { backgroundColor: sv.color }]} />

                      {/* Corpo do card */}
                      <View style={styles.cardBody}>
                        {/* Linha superior: avatar + nome + preço */}
                        <View style={styles.cardHead}>
                          {b.counterpartAvatarUrl ? (
                            <Image source={{ uri: b.counterpartAvatarUrl }} style={styles.avatarImg} />
                          ) : (
                            <View style={[styles.avatar, { backgroundColor: sv.color + '22' }]}>
                              <Text style={[styles.avatarText, { color: sv.color }]}>
                                {getInitials(counterpart)}
                              </Text>
                            </View>
                          )}
                          <View style={styles.nameBlock}>
                            <Text style={[styles.roleLabel, { color: sv.color }]}>{roleLabel}</Text>
                            <Text style={styles.personName} numberOfLines={1}>{counterpart}</Text>
                          </View>
                          <View style={styles.priceBlock}>
                            <Text style={[styles.priceText, { color: isHistory ? c.muted : sv.color }]}>
                              R$ {b.totalPrice.toFixed(0)}
                            </Text>
                            <View style={[styles.statusPill, { backgroundColor: sv.color + '20' }]}>
                              <View style={[styles.statusDot, { backgroundColor: sv.color }]} />
                              <Text style={[styles.statusPillText, { color: sv.color }]}>{sv.label}</Text>
                            </View>
                          </View>
                        </View>

                        {/* Chips de informação */}
                        <View style={styles.chips}>
                          <InfoChip icon="calendar-o" text={formatDate(b.eventDate)} c={c} styles={styles} />
                          <InfoChip icon="users" text={`${b.guestsCount} pess.`} c={c} styles={styles} />
                          <InfoChip icon="map-marker" text={b.address.split(',')[0]} c={c} styles={styles} />
                          {b.createdAt && (
                            <InfoChip icon="clock-o" text={`Solicitado ${formatDate(b.createdAt)}`} c={c} styles={styles} />
                          )}
                        </View>

                        {/* Botões de ação contextuais (chef apenas) */}
                        {tab === 'chef' && b.status === 'solicitado' && (
                          <View style={styles.actRow}>
                            <TouchableOpacity
                              style={[styles.btnOutline, { borderColor: c.danger, flex: 1 }]}
                              onPress={() => act(b.id, 'cancelado')}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.btnOutlineText, { color: c.danger }]}>Recusar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.btnSolid, { backgroundColor: c.success, flex: 1.5 }]}
                              onPress={() => act(b.id, 'confirmado')}
                              activeOpacity={0.8}
                            >
                              <FontAwesome name="check" size={12} color="#fff" />
                              <Text style={styles.btnSolidText}>Aceitar</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {tab === 'chef' && b.status === 'confirmado' && (
                          <TouchableOpacity
                            style={[styles.btnSolid, { backgroundColor: c.primary }]}
                            onPress={() => act(b.id, 'concluido')}
                            activeOpacity={0.8}
                          >
                            <FontAwesome name="check-circle" size={13} color={c.onPrimary} />
                            <Text style={[styles.btnSolidText, { color: c.onPrimary }]}>Concluir serviço</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </ScreenGradient>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function InfoChip({
  icon, text, c, styles,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  text: string;
  c: Palette;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.chip}>
      <FontAwesome name={icon} size={11} color={c.hint} />
      <Text style={styles.chipText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 48, paddingTop: 20 },

    title: { fontSize: 26, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    subtitle: { fontSize: 13, color: c.muted, marginTop: 4, marginBottom: 20 },

    // Seletor de aba
    segment: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
      gap: 4,
    },
    segBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 9,
      gap: 6,
    },
    segBtnActive: { backgroundColor: c.primary },
    segText: { fontSize: 13, fontWeight: '600', color: c.muted },
    segTextActive: { color: c.onPrimary },
    badge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 1 },
    badgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    badgeInactive: { backgroundColor: c.warning + '28' },
    badgeText: { fontSize: 11, fontWeight: '700', color: c.warning },

    // Busca e filtros
    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, marginBottom: 10, height: 44,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.cream, paddingVertical: 10 },
    filterScroll: { marginBottom: 16 },
    filterContent: { gap: 8, paddingRight: 4 },
    filterChip: {
      borderWidth: 1, borderColor: c.border, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 7, backgroundColor: c.card,
    },
    filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterChipText: { fontSize: 13, color: c.muted, fontWeight: '600' },
    filterChipTextActive: { color: c.onPrimary },

    // Empty state
    emptyWrap: { alignItems: 'center', marginTop: 48, gap: 14, paddingHorizontal: 12 },
    emptyIcon: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: c.cream, textAlign: 'center' },
    emptySub: { fontSize: 13, color: c.muted, textAlign: 'center', lineHeight: 20 },

    // Cabeçalho de seção
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 10,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.5,
    },
    sectionBadge: {
      borderRadius: 20,
      paddingHorizontal: 7,
      paddingVertical: 1,
      marginLeft: 2,
    },
    sectionBadgeText: { fontSize: 11, fontWeight: '700' },

    // Card
    card: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: GSpacing.radius,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 12,
      overflow: 'hidden',
    },
    cardHistory: { opacity: 0.65 },
    cardStrip: { width: 4 },
    cardBody: { flex: 1, padding: 14 },

    // Cabeçalho do card
    cardHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 11,
    },
    avatar: {
      width: 38, height: 38, borderRadius: 19,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    avatarImg: { width: 38, height: 38, borderRadius: 19, flexShrink: 0 },
    avatarText: { fontSize: 13, fontWeight: '700', fontFamily: brandFont },
    nameBlock: { flex: 1, minWidth: 0 },
    roleLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: '600' },
    personName: { fontSize: 15, fontWeight: '700', color: c.cream, marginTop: 2 },
    priceBlock: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
    priceText: { fontSize: 17, fontWeight: '700', fontFamily: brandFont },
    statusPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusPillText: { fontSize: 11, fontWeight: '600' },

    // Chips de info
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: c.card, borderRadius: 6,
      paddingHorizontal: 9, paddingVertical: 5,
      maxWidth: 160,
    },
    chipText: { fontSize: 12, color: c.muted, flexShrink: 1 },

    // Botões
    actRow: { flexDirection: 'row', gap: 8 },
    btnSolid: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      borderRadius: 9, paddingVertical: 10,
    },
    btnSolidText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    btnOutline: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderRadius: 9, paddingVertical: 9,
    },
    btnOutlineText: { fontSize: 13, fontWeight: '600' },
  });
