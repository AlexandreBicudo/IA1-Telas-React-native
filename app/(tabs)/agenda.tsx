import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect, Ellipse, Line } from 'react-native-svg';

import { GSpacing, GShadow, brandFont, type Palette } from '@/constants/gourmet-theme';
import { AccentBar, ScreenGradient } from '@/components/ui-gourmet';
import { SkeletonBookingCard } from '@/components/skeleton';
import { NotificationBell } from '@/components/NotificationBell';
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
type ViewMode = 'landing' | Tab;

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

// ─── SVG Illustrations ───────────────────────────────────────────────────────

function ClientIllustration({ primary, success }: { primary: string; success: string }) {
  return (
    <Svg width={120} height={96} viewBox="0 0 120 96">
      {/* Table */}
      <Rect x={20} y={62} width={80} height={8} rx={4} fill={primary + '40'} />
      <Rect x={28} y={70} width={6} height={20} rx={3} fill={primary + '30'} />
      <Rect x={86} y={70} width={6} height={20} rx={3} fill={primary + '30'} />
      {/* Plate */}
      <Ellipse cx={60} cy={56} rx={22} ry={8} fill={primary + '20'} />
      <Ellipse cx={60} cy={54} rx={16} ry={5} fill={primary + '35'} />
      {/* Food */}
      <Circle cx={60} cy={52} r={6} fill={success + '80'} />
      <Circle cx={54} cy={54} r={4} fill={primary + '90'} />
      <Circle cx={66} cy={54} r={4} fill={primary + '90'} />
      {/* Fork & knife */}
      <Line x1={38} y1={44} x2={38} y2={66} stroke={primary} strokeWidth={2} strokeLinecap="round" />
      <Line x1={38} y1={44} x2={35} y2={50} stroke={primary} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={38} y1={44} x2={41} y2={50} stroke={primary} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={82} y1={44} x2={82} y2={66} stroke={primary} strokeWidth={2} strokeLinecap="round" />
      {/* Chef silhouette */}
      <Circle cx={60} cy={20} r={9} fill={primary + '60'} />
      {/* Toque (chef hat) */}
      <Rect x={52} y={8} width={16} height={10} rx={3} fill={primary + '80'} />
      <Ellipse cx={60} cy={9} rx={10} ry={4} fill={primary} />
      {/* Body */}
      <Path d="M48 40 Q60 36 72 40 L70 56 Q60 52 50 56 Z" fill={primary + '50'} />
      {/* Star badge */}
      <Circle cx={95} cy={16} r={10} fill={success + '30'} />
      <Path d="M95 10 L96.5 14.5 L101 14.5 L97.5 17.5 L99 22 L95 19 L91 22 L92.5 17.5 L89 14.5 L93.5 14.5 Z" fill={success} />
    </Svg>
  );
}

function ChefIllustration({ success, primary }: { success: string; primary: string }) {
  return (
    <Svg width={120} height={96} viewBox="0 0 120 96">
      {/* Clipboard / orders */}
      <Rect x={72} y={28} width={36} height={44} rx={4} fill={success + '25'} stroke={success + '60'} strokeWidth={1.5} />
      <Rect x={80} y={22} width={20} height={8} rx={2} fill={success + '50'} />
      <Line x1={79} y1={42} x2={101} y2={42} stroke={success + '60'} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={79} y1={50} x2={101} y2={50} stroke={success + '40'} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={79} y1={58} x2={95} y2={58} stroke={success + '40'} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={76} cy={42} r={3} fill={success + '80'} />
      <Circle cx={76} cy={50} r={3} fill={success + '50'} />
      <Circle cx={76} cy={58} r={3} fill={success + '30'} />
      {/* Chef large */}
      <Circle cx={44} cy={26} r={12} fill={success + '50'} />
      {/* Toque grande */}
      <Rect x={34} y={10} width={20} height={14} rx={4} fill={success + '70'} />
      <Ellipse cx={44} cy={11} rx={13} ry={5} fill={success} />
      {/* Body + apron */}
      <Path d="M30 56 Q44 50 58 56 L56 80 Q44 74 32 80 Z" fill={success + '45'} />
      <Rect x={37} y={54} width={14} height={24} rx={3} fill={'#fff' + '30'} />
      {/* Arm holding pan */}
      <Path d="M58 58 Q70 52 68 44" stroke={success + '60'} strokeWidth={6} strokeLinecap="round" fill="none" />
      {/* Frying pan */}
      <Ellipse cx={64} cy={40} rx={10} ry={7} fill={primary + '40'} stroke={primary + '80'} strokeWidth={1.5} />
      <Line x1={74} y1={40} x2={82} y2={36} stroke={primary + '80'} strokeWidth={3} strokeLinecap="round" />
      {/* Steam */}
      <Path d="M60 32 Q62 28 60 24" stroke={primary + '50'} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Path d="M65 30 Q67 26 65 22" stroke={primary + '40'} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      {/* Dollar badge */}
      <Circle cx={16} cy={20} r={12} fill={primary + '30'} />
      <Path d="M16 12 L16 28 M12 15 Q16 13 20 15 Q20 19 16 20 Q20 21 20 25 Q16 27 12 25" stroke={primary} strokeWidth={2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

// ─── Landing Card ─────────────────────────────────────────────────────────────

function LandingCard({
  onPress, title, subtitle, badge, borderColor, iconBg, illustration, styles, c,
}: {
  onPress: () => void;
  title: string;
  subtitle: string;
  badge?: number;
  borderColor: string;
  iconBg: string;
  illustration: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
  c: Palette;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[styles.landingCard, { borderColor }, { transform: [{ scale }] }]}>
        {badge !== undefined && badge > 0 && (
          <View style={[styles.landingBadge, { backgroundColor: c.warning }]}>
            <Text style={styles.landingBadgeText}>{badge}</Text>
          </View>
        )}
        <View style={[styles.landingIllustration, { backgroundColor: iconBg }]}>
          {illustration}
        </View>
        <Text style={styles.landingCardTitle}>{title}</Text>
        <Text style={styles.landingCardSub}>{subtitle}</Text>
        <View style={[styles.landingBtn, { borderColor }]}>
          <Text style={[styles.landingBtnText, { color: borderColor }]}>Ver agenda</Text>
          <FontAwesome name="arrow-right" size={12} color={borderColor} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function AgendaScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c), [c]);
  const STATUS = useMemo(() => statusUi(c), [c]);

  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [data, setData] = useState<MyBookings>({ asClient: [], asChef: [] });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const load = useCallback(() => {
    setLoading(true);
    getMyBookings().then((d) => { setData(d); setLoading(false); });
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    setViewMode('landing');
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [load]));

  const navigateTo = (tab: Tab) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setViewMode(tab);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    });
  };

  const goBack = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 20, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setViewMode('landing');
      slideAnim.setValue(-20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    });
  };

  const tab = viewMode !== 'landing' ? viewMode : 'client';

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

  const pendingClient = data.asClient.filter((b) => b.status === 'solicitado').length;
  const pendingChef   = data.asChef.filter((b) => b.status === 'solicitado').length;

  return (
    <ScreenGradient>
      {/* ════════ LANDING ════════ */}
      {viewMode === 'landing' && (
        <Animated.ScrollView
          contentContainerStyle={[styles.landingScroll, { paddingTop: insets.top + 8 }]}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={styles.landingHeader}>
            <View>
              <Text style={styles.title}>Minha agenda</Text>
              <Text style={styles.subtitle}>Selecione como deseja visualizar</Text>
            </View>
            <NotificationBell />
          </View>

          <View style={styles.landingCards}>
            <LandingCard
              styles={styles} c={c}
              title="Contratei um chef"
              subtitle="Serviços que você solicitou a chefs profissionais"
              borderColor={c.primary}
              iconBg={c.primary + '15'}
              illustration={<ClientIllustration primary={c.primary} success={c.success} />}
              onPress={() => navigateTo('client')}
            />
            <LandingCard
              styles={styles} c={c}
              title="Sou o chef"
              subtitle="Pedidos recebidos e serviços que você vai executar"
              borderColor={c.success}
              iconBg={c.success + '15'}
              illustration={<ChefIllustration success={c.success} primary={c.primary} />}
              onPress={() => navigateTo('chef')}
            />
          </View>

          {/* Resumo rápido */}
          {!loading && (data.asClient.length > 0 || data.asChef.length > 0) && (
            <View style={styles.quickSummary}>
              <Text style={styles.quickSummaryTitle}>RESUMO</Text>
              <View style={styles.quickSummaryRow}>
                <View style={styles.quickStat}>
                  <Text style={[styles.quickStatNum, { color: c.primary }]}>{data.asClient.length}</Text>
                  <Text style={styles.quickStatLabel}>Contratados</Text>
                </View>
                <View style={styles.quickSumDivider} />
                <View style={styles.quickStat}>
                  <Text style={[styles.quickStatNum, { color: c.warning }]}>{pendingClient + pendingChef}</Text>
                  <Text style={styles.quickStatLabel}>Pendentes</Text>
                </View>
                <View style={styles.quickSumDivider} />
                <View style={styles.quickStat}>
                  <Text style={[styles.quickStatNum, { color: c.success }]}>{data.asChef.length}</Text>
                  <Text style={styles.quickStatLabel}>Recebidos</Text>
                </View>
              </View>
            </View>
          )}
        </Animated.ScrollView>
      )}

      {/* ════════ LIST VIEW ════════ */}
      {viewMode !== 'landing' && (
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]} showsVerticalScrollIndicator={false}>
            {/* Back header */}
            <View style={styles.listHeader}>
              <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={10}>
                <FontAwesome name="chevron-left" size={16} color={c.cream} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  {viewMode === 'client' ? 'Contratei um chef' : 'Sou o chef'}
                </Text>
                <Text style={styles.subtitle}>
                  {viewMode === 'client' ? 'Serviços contratados' : 'Pedidos recebidos'}
                </Text>
              </View>
              <NotificationBell />
            </View>

            {/* Busca e filtros */}
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

            {/* Conteúdo */}
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
                    : viewMode === 'client' ? 'Nenhum serviço contratado' : 'Nenhum pedido recebido'}
                </Text>
                <Text style={styles.emptySub}>
                  {searchText || dateFilter !== 'all'
                    ? 'Tente outro período ou limpe a busca.'
                    : viewMode === 'client'
                      ? 'Encontre um chef no catálogo e faça seu primeiro agendamento.'
                      : 'Quando clientes solicitarem seu serviço, eles aparecerão aqui.'}
                </Text>
              </View>
            ) : (
              grouped.map(({ group, items }) => (
                <View key={group.key}>
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

                  {items.map((b) => {
                    const sv = STATUS[b.status];
                    const counterpart = viewMode === 'client' ? b.chefName : b.clientName;
                    const roleLabel = viewMode === 'client' ? 'CHEF' : 'CLIENTE';
                    const isHistory = group.key === 'history';

                    return (
                      <TouchableOpacity
                        key={b.id}
                        activeOpacity={0.85}
                        onPress={() =>
                          router.push({
                            pathname: '/agendamento/[id]',
                            params: { id: b.id, role: viewMode === 'client' ? 'client' : 'chef' },
                          } as any as Href)
                        }
                      >
                        <View style={[styles.card, isHistory && styles.cardHistory, GShadow]}>
                          <View style={[styles.cardStrip, { backgroundColor: sv.color }]} />
                          <View style={styles.cardBody}>
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

                            <View style={styles.chips}>
                              <InfoChip icon="calendar-o" text={formatDate(b.eventDate)} c={c} styles={styles} />
                              <InfoChip icon="users" text={`${b.guestsCount} pess.`} c={c} styles={styles} />
                              <InfoChip icon="map-marker" text={b.address.split(',')[0]} c={c} styles={styles} />
                              {b.createdAt && (
                                <InfoChip icon="clock-o" text={`Solicitado ${formatDate(b.createdAt)}`} c={c} styles={styles} />
                              )}
                            </View>

                            {viewMode === 'chef' && b.status === 'solicitado' && (
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
                            {viewMode === 'chef' && b.status === 'confirmado' && (
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
        </Animated.View>
      )}
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
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 48 },

    title: { fontSize: 26, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    subtitle: { fontSize: 13, color: c.muted, marginTop: 4 },

    // ─── Landing ───
    landingScroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 48 },
    landingHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 },
    landingCards: { gap: 16 },
    landingCard: {
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      position: 'relative',
      overflow: 'visible',
      ...GShadow,
    },
    landingIllustration: {
      width: 140,
      height: 110,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    landingCardTitle: {
      fontSize: 20, fontWeight: '800', color: c.cream, fontFamily: brandFont, textAlign: 'center',
    },
    landingCardSub: {
      fontSize: 13, color: c.muted, textAlign: 'center', marginTop: 6, marginBottom: 16, lineHeight: 18, paddingHorizontal: 8,
    },
    landingBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1.5, borderRadius: 10,
      paddingVertical: 10, paddingHorizontal: 24,
    },
    landingBtnText: { fontSize: 14, fontWeight: '700' },
    landingBadge: {
      position: 'absolute', top: -10, right: -10,
      minWidth: 26, height: 26, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 6,
      borderWidth: 2, borderColor: c.dark,
      zIndex: 10,
    },
    landingBadgeText: { fontSize: 12, fontWeight: '800', color: '#000' },

    // Quick summary
    quickSummary: {
      marginTop: 24,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: 16,
    },
    quickSummaryTitle: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '700', marginBottom: 12 },
    quickSummaryRow: { flexDirection: 'row', alignItems: 'center' },
    quickStat: { flex: 1, alignItems: 'center', gap: 4 },
    quickStatNum: { fontSize: 24, fontWeight: '800', fontFamily: brandFont },
    quickStatLabel: { fontSize: 11, color: c.muted, fontWeight: '600' },
    quickSumDivider: { width: 1, height: 36, backgroundColor: c.border },

    // ─── List header ───
    listHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
    backBtn: {
      width: 38, height: 38, borderRadius: 10,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
    },

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
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10, marginTop: 4 },
    sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
    sectionBadge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 1, marginLeft: 2 },
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
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 11 },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    avatarImg: { width: 38, height: 38, borderRadius: 19, flexShrink: 0 },
    avatarText: { fontSize: 13, fontWeight: '700', fontFamily: brandFont },
    nameBlock: { flex: 1, minWidth: 0 },
    roleLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: '600' },
    personName: { fontSize: 15, fontWeight: '700', color: c.cream, marginTop: 2 },
    priceBlock: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
    priceText: { fontSize: 17, fontWeight: '700', fontFamily: brandFont },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusPillText: { fontSize: 11, fontWeight: '600' },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: c.card, borderRadius: 6,
      paddingHorizontal: 9, paddingVertical: 5, maxWidth: 160,
    },
    chipText: { fontSize: 12, color: c.muted, flexShrink: 1 },

    actRow: { flexDirection: 'row', gap: 8 },
    btnSolid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 9, paddingVertical: 10 },
    btnSolidText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    btnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 9, paddingVertical: 9 },
    btnOutlineText: { fontSize: 13, fontWeight: '600' },
  });
