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

function ClientIllustration() {
  return (
    <Svg width={140} height={110} viewBox="0 0 140 110">
      {/* Background */}
      <Rect width={140} height={110} rx={14} fill="#1E0E06" />
      {/* Chef hat */}
      <Rect x={57} y={29} width={26} height={8} rx={2} fill="#F0EEE8" stroke="#D5D2CA" strokeWidth={0.8} />
      <Path d="M57 29 Q55 11 70 9 Q85 11 83 29 Z" fill="#F0EEE8" stroke="#D5D2CA" strokeWidth={0.8} />
      <Rect x={57} y={29} width={26} height={3} rx={1} fill="#E0DDD5" />
      {/* Chef head */}
      <Circle cx={70} cy={43} r={10} fill="#EBA878" />
      <Circle cx={66} cy={42} r={1.6} fill="#6B3C1E" fillOpacity={0.45} />
      <Circle cx={74} cy={42} r={1.6} fill="#6B3C1E" fillOpacity={0.45} />
      <Path d="M66.5 49 Q70 52 73.5 49" fill="none" stroke="#6B3C1E" strokeWidth={1.1} strokeOpacity={0.35} strokeLinecap="round" />
      {/* Neck */}
      <Rect x={66} y={52} width={8} height={7} fill="#EBA878" />
      {/* Chef coat */}
      <Path d="M44 68 Q70 57 96 68 L94 80 Q70 73 46 80 Z" fill="#F8F6F2" />
      <Line x1={70} y1={57} x2={70} y2={80} stroke="#E2DFDA" strokeWidth={0.9} />
      <Circle cx={66} cy={64} r={1.2} fill="#C8A05F" />
      <Circle cx={74} cy={64} r={1.2} fill="#C8A05F" />
      <Circle cx={66} cy={70} r={1.2} fill="#C8A05F" />
      <Circle cx={74} cy={70} r={1.2} fill="#C8A05F" />
      {/* Table surface */}
      <Path d="M12 74 L128 74 L132 88 L8 88 Z" fill="#3A1E0A" />
      {/* Tablecloth */}
      <Path d="M14 74 L126 74 L130 87 L10 87 Z" fill="#F2EDE0" />
      {/* Table face */}
      <Rect x={8} y={88} width={124} height={18} rx={2} fill="#28150A" />
      {/* Plate */}
      <Ellipse cx={70} cy={76} rx={19} ry={5.5} fill="#DDD5C0" />
      <Ellipse cx={70} cy={75} rx={15} ry={4} fill="#C8BEA8" />
      {/* Cloche dome */}
      <Path d="M53 76 Q53 53 70 53 Q87 53 87 76 Z" fill="#D8D4CC" stroke="#B8B4AC" strokeWidth={1} />
      <Line x1={51} y1={76} x2={89} y2={76} stroke="#B0ACA4" strokeWidth={1.5} />
      <Ellipse cx={70} cy={54} rx={4} ry={2.5} fill="#C8A05F" stroke="#A8842A" strokeWidth={0.8} />
      {/* Forks (left) */}
      <Line x1={28} y1={58} x2={28} y2={82} stroke="#CCC4A0" strokeWidth={2} strokeLinecap="round" />
      <Line x1={34} y1={58} x2={34} y2={82} stroke="#CCC4A0" strokeWidth={2} strokeLinecap="round" />
      <Line x1={40} y1={58} x2={40} y2={82} stroke="#CCC4A0" strokeWidth={2} strokeLinecap="round" />
      <Line x1={46} y1={58} x2={46} y2={82} stroke="#CCC4A0" strokeWidth={2} strokeLinecap="round" />
      <Line x1={26} y1={58} x2={26} y2={64} stroke="#CCC4A0" strokeWidth={1.3} strokeLinecap="round" />
      <Line x1={28} y1={58} x2={28} y2={64} stroke="#CCC4A0" strokeWidth={1.3} strokeLinecap="round" />
      <Line x1={30} y1={58} x2={30} y2={64} stroke="#CCC4A0" strokeWidth={1.3} strokeLinecap="round" />
      <Path d="M26 64 Q28 67 30 64" fill="none" stroke="#CCC4A0" strokeWidth={1.3} />
      {/* Knives (right) */}
      <Line x1={94} y1={58} x2={94} y2={82} stroke="#CCC4A0" strokeWidth={2} strokeLinecap="round" />
      <Line x1={100} y1={58} x2={100} y2={82} stroke="#CCC4A0" strokeWidth={2} strokeLinecap="round" />
      <Line x1={106} y1={58} x2={106} y2={82} stroke="#CCC4A0" strokeWidth={2} strokeLinecap="round" />
      <Line x1={112} y1={58} x2={112} y2={82} stroke="#CCC4A0" strokeWidth={2} strokeLinecap="round" />
      <Path d="M94 58 Q98 62 98 70 L94 70" fill="#CCC4A0" fillOpacity={0.4} />
      {/* Wine glass left */}
      <Ellipse cx={18} cy={56} rx={6} ry={3.5} fill="#C8A05F" fillOpacity={0.15} stroke="#C8A05F" strokeWidth={1} />
      <Path d="M18 60 Q14 68 16 73 L13 77" fill="none" stroke="#C8A05F" strokeWidth={1.3} strokeLinecap="round" />
      <Line x1={10} y1={77} x2={16} y2={77} stroke="#C8A05F" strokeWidth={1.3} strokeLinecap="round" />
      {/* Wine glass right */}
      <Ellipse cx={122} cy={56} rx={6} ry={3.5} fill="#C8A05F" fillOpacity={0.15} stroke="#C8A05F" strokeWidth={1} />
      <Path d="M122 60 Q126 68 124 73 L127 77" fill="none" stroke="#C8A05F" strokeWidth={1.3} strokeLinecap="round" />
      <Line x1={124} y1={77} x2={130} y2={77} stroke="#C8A05F" strokeWidth={1.3} strokeLinecap="round" />
      {/* Green star badge (top-right) */}
      <Circle cx={119} cy={19} r={15} fill="#1C5C34" />
      <Circle cx={119} cy={19} r={13} fill="#2A8A50" />
      <Path d="M119 9 L121.5 15.5 L128.5 15.5 L123 19.5 L125.5 26 L119 22 L112.5 26 L115 19.5 L109.5 15.5 L116.5 15.5 Z" fill="#FFFFFF" />
    </Svg>
  );
}

function ChefIllustration() {
  return (
    <Svg width={140} height={110} viewBox="0 0 140 110">
      {/* Background */}
      <Rect width={140} height={110} rx={14} fill="#0C1E12" />
      {/* Chef hat */}
      <Rect x={57} y={19} width={26} height={8} rx={2} fill="#F0EEE8" stroke="#D5D2CA" strokeWidth={0.8} />
      <Path d="M57 19 Q55 2 70 0 Q85 2 83 19 Z" fill="#F0EEE8" stroke="#D5D2CA" strokeWidth={0.8} />
      <Rect x={57} y={19} width={26} height={3} rx={1} fill="#E0DDD5" />
      {/* Chef head */}
      <Circle cx={70} cy={33} r={10} fill="#EBA878" />
      <Circle cx={66} cy={32} r={1.6} fill="#6B3C1E" fillOpacity={0.45} />
      <Circle cx={74} cy={32} r={1.6} fill="#6B3C1E" fillOpacity={0.45} />
      <Path d="M66.5 38 Q70 41 73.5 38" fill="none" stroke="#6B3C1E" strokeWidth={1.1} strokeOpacity={0.35} strokeLinecap="round" />
      {/* Neck */}
      <Rect x={66} y={42} width={8} height={6} fill="#EBA878" />
      {/* Chef coat */}
      <Path d="M36 56 Q70 44 104 56 L102 106 Q70 98 38 106 Z" fill="#F8F6F2" />
      <Line x1={70} y1={44} x2={70} y2={106} stroke="#E2DFDA" strokeWidth={0.9} />
      <Rect x={62} y={50} width={16} height={52} rx={2} fill="#F0EDEA" />
      <Circle cx={66} cy={54} r={1.3} fill="#8B7355" />
      <Circle cx={74} cy={54} r={1.3} fill="#8B7355" />
      <Circle cx={66} cy={62} r={1.3} fill="#8B7355" />
      <Circle cx={74} cy={62} r={1.3} fill="#8B7355" />
      {/* Arms */}
      <Path d="M38 68 Q26 76 24 86" stroke="#EBA878" strokeWidth={9} strokeLinecap="round" fill="none" />
      <Path d="M102 68 Q114 76 116 86" stroke="#EBA878" strokeWidth={9} strokeLinecap="round" fill="none" />
      {/* Pot handles */}
      <Path d="M38 88 Q28 88 28 82 Q28 76 38 76" fill="none" stroke="#555555" strokeWidth={5.5} strokeLinecap="round" />
      <Path d="M102 88 Q112 88 112 82 Q112 76 102 76" fill="none" stroke="#555555" strokeWidth={5.5} strokeLinecap="round" />
      {/* Pot body */}
      <Rect x={36} y={82} width={68} height={26} rx={7} fill="#787878" />
      <Path d="M44 84 Q50 78 54 82" fill="none" stroke="#C0C0C0" strokeWidth={2} strokeLinecap="round" />
      {/* Pot rim */}
      <Rect x={34} y={79} width={72} height={7} rx={3} fill="#989898" />
      {/* Pot lid */}
      <Rect x={36} y={72} width={68} height={10} rx={5} fill="#909090" />
      <Rect x={38} y={72} width={64} height={5} rx={3} fill="#AAAAAA" />
      <Ellipse cx={70} cy={71} rx={9} ry={3.5} fill="#B4B4B4" stroke="#888888" strokeWidth={0.8} />
      {/* Dollar badge (top-left) */}
      <Circle cx={22} cy={22} r={16} fill="#6B4A0A" />
      <Circle cx={22} cy={22} r={14} fill="#C8A05F" />
      <Circle cx={22} cy={22} r={11} fill="#D4AC68" />
      <Line x1={22} y1={13} x2={22} y2={31} stroke="#6B4010" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M18 16 Q18 13 22 13 Q27 13 27 17.5 Q27 21 22 21 Q17 21 17 25.5 Q17 29 22 29 Q27 29 27 26" fill="none" stroke="#6B4010" strokeWidth={1.6} strokeLinecap="round" />
      {/* Clipboard (right) */}
      <Rect x={106} y={32} width={28} height={48} rx={4} fill="#9B7040" />
      <Rect x={106} y={32} width={28} height={48} rx={4} fill="none" stroke="#7A5028" strokeWidth={1} />
      <Rect x={115} y={28} width={10} height={8} rx={2} fill="#7A5028" />
      <Rect x={116} y={27} width={8} height={5} rx={1} fill="#5A3A18" />
      <Path d="M112 46 L115 50 L121 42" fill="none" stroke="#52B788" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={123} y1={46} x2={130} y2={46} stroke="#F5EDD8" strokeWidth={1.4} strokeOpacity={0.65} strokeLinecap="round" />
      <Path d="M112 58 L115 62 L121 54" fill="none" stroke="#52B788" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={123} y1={58} x2={130} y2={58} stroke="#F5EDD8" strokeWidth={1.4} strokeOpacity={0.65} strokeLinecap="round" />
      <Path d="M112 70 L115 74 L121 66" fill="none" stroke="#52B788" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={123} y1={70} x2={128} y2={70} stroke="#F5EDD8" strokeWidth={1.4} strokeOpacity={0.5} strokeLinecap="round" />
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
              iconBg="#1E0E06"
              illustration={<ClientIllustration />}
              onPress={() => navigateTo('client')}
            />
            <LandingCard
              styles={styles} c={c}
              title="Sou o chef"
              subtitle="Pedidos recebidos e serviços que você vai executar"
              borderColor={c.success}
              iconBg="#0C1E12"
              illustration={<ChefIllustration />}
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
                                {b.paymentStatus === 'pago' && !isHistory && (
                                  <View style={[styles.payBadge, { backgroundColor: c.success + '22', borderColor: c.success + '60' }]}>
                                    <FontAwesome name="check-circle" size={9} color={c.success} />
                                    <Text style={[styles.payBadgeText, { color: c.success }]}>Pago</Text>
                                  </View>
                                )}
                                {b.paymentStatus !== 'pago' && b.status === 'confirmado' && (
                                  <View style={[styles.payBadge, { backgroundColor: c.warning + '22', borderColor: c.warning + '60' }]}>
                                    <FontAwesome name="clock-o" size={9} color={c.warning} />
                                    <Text style={[styles.payBadgeText, { color: c.warning }]}>Pag. pendente</Text>
                                  </View>
                                )}
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
      borderRadius: 14,
      overflow: 'hidden',
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

    payBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    payBadgeText: { fontSize: 10, fontWeight: '700' },

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
