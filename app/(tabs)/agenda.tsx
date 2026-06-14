import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { GSpacing, brandFont, type Palette } from '@/constants/gourmet-theme';
import { AccentBar, Panel, ScreenGradient } from '@/components/ui-gourmet';
import { SkeletonBookingCard } from '@/components/skeleton';
import { useColors } from '@/components/theme-context';
import { getMyBookings, updateBookingStatus, type MyBookings } from '@/services/bookingService';
import type { BookingStatus } from '@/types/database';

function statusUi(c: Palette): Record<BookingStatus, { label: string; color: string }> {
  return {
    solicitado: { label: 'Solicitado', color: c.warning },
    confirmado: { label: 'Confirmado', color: c.success },
    em_andamento: { label: 'Em andamento', color: c.primary },
    concluido: { label: 'Concluído', color: c.muted },
    cancelado: { label: 'Cancelado', color: c.danger },
  };
}

type Tab = 'client' | 'chef';

export default function AgendaScreen() {
  const c = useColors();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(c), [c]);
  const STATUS = useMemo(() => statusUi(c), [c]);

  const [tab, setTab] = useState<Tab>('client');
  const [data, setData] = useState<MyBookings>({ asClient: [], asChef: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getMyBookings().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  useFocusEffect(load);

  const act = async (id: string, status: BookingStatus) => {
    try {
      await updateBookingStatus(id, status);
      load();
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o agendamento.');
    }
  };

  const list = tab === 'client' ? data.asClient : data.asChef;

  return (
    <ScreenGradient>
      <AccentBar />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Meus agendamentos</Text>
        <Text style={styles.subtitle}>Acompanhe os serviços contratados e recebidos.</Text>

        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'client' && styles.segmentBtnActive]}
            onPress={() => setTab('client')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, tab === 'client' && { color: c.onPrimary }]}>Contratei</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'chef' && styles.segmentBtnActive]}
            onPress={() => setTab('chef')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, tab === 'chef' && { color: c.onPrimary }]}>Recebi (como chef)</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          [1, 2, 3].map((n) => <SkeletonBookingCard key={n} />)
        ) : list.length === 0 ? (
          <View style={styles.emptyWrap}>
            <FontAwesome name="calendar-o" size={32} color={c.hint} />
            <Text style={styles.empty}>
              {tab === 'client'
                ? 'Você ainda não contratou nenhum serviço. Encontre um chef no catálogo!'
                : 'Você ainda não recebeu pedidos de agendamento.'}
            </Text>
          </View>
        ) : (
          list.map((b) => (
            <TouchableOpacity
              key={b.id}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/agendamento/[id]', params: { id: b.id, role: tab === 'client' ? 'client' : 'chef' } } as any as Href)}
            >
            <Panel style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.counterpartLabel}>{tab === 'client' ? 'Chef' : 'Cliente'}</Text>
                  <Text style={styles.counterpart}>{tab === 'client' ? b.chefName : b.clientName}</Text>
                </View>
                <View style={[styles.statusPill, { borderColor: STATUS[b.status].color }]}>
                  <Text style={[styles.statusText, { color: STATUS[b.status].color }]}>{STATUS[b.status].label}</Text>
                </View>
              </View>

              <View style={styles.cardInfo}>
                <Info styles={styles} c={c} icon="calendar" text={formatDate(b.eventDate)} />
                <Info styles={styles} c={c} icon="users" text={`${b.guestsCount} pessoas`} />
                <Info styles={styles} c={c} icon="map-marker" text={b.address} />
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.price}>R$ {b.totalPrice.toFixed(0)}</Text>
                <View style={styles.actions}>
                  {tab === 'chef' && b.status === 'solicitado' && (
                    <>
                      <ActionBtn styles={styles} color={c.danger} label="Recusar" onPress={() => act(b.id, 'cancelado')} />
                      <ActionBtn styles={styles} color={c.primary} label="Aceitar" onPress={() => act(b.id, 'confirmado')} />
                    </>
                  )}
                  {tab === 'chef' && b.status === 'confirmado' && (
                    <ActionBtn styles={styles} color={c.primary} label="Concluir" onPress={() => act(b.id, 'concluido')} />
                  )}
                  {tab === 'client' && (b.status === 'solicitado' || b.status === 'confirmado') && (
                    <ActionBtn styles={styles} color={c.danger} label="Cancelar" onPress={() => act(b.id, 'cancelado')} />
                  )}
                </View>
              </View>
            </Panel>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ScreenGradient>
  );
}

function Info({
  styles,
  c,
  icon,
  text,
}: {
  styles: ReturnType<typeof makeStyles>;
  c: Palette;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  text: string;
}) {
  return (
    <View style={styles.infoRow}>
      <FontAwesome name={icon} size={12} color={c.muted} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function ActionBtn({
  styles,
  color,
  label,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { borderColor: color }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 40, paddingTop: 24 },
    title: { fontSize: 26, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    subtitle: { fontSize: 14, color: c.muted, marginTop: 4, marginBottom: 20 },
    segment: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      padding: 4,
      marginBottom: 22,
    },
    segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 7, alignItems: 'center' },
    segmentBtnActive: { backgroundColor: c.primary },
    segmentText: { fontSize: 13, fontWeight: '600', color: c.muted },
    emptyWrap: { alignItems: 'center', marginTop: 50, gap: 12, paddingHorizontal: 20 },
    empty: { textAlign: 'center', color: c.muted, fontSize: 14, lineHeight: 20 },
    card: { padding: 16, marginBottom: 14 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
    counterpartLabel: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '600', textTransform: 'uppercase' },
    counterpart: { fontSize: 17, fontWeight: '700', color: c.cream, marginTop: 2 },
    statusPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 11, fontWeight: '600' },
    cardInfo: { marginTop: 12, gap: 6 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { fontSize: 13, color: c.cream },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
    price: { fontSize: 16, fontWeight: '700', color: c.primary },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    actionBtnText: { fontSize: 13, fontWeight: '600' },
  });
