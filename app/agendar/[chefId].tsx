import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

import { useColors } from '@/components/theme-context';
import { AccentButton, Panel, ScreenGradient } from '@/components/ui-gourmet';
import { GSpacing, brandFont, type Palette } from '@/constants/gourmet-theme';
import { getChefAvailableDates, getChefBookedDates } from '@/services/availabilityService';
import { createBooking } from '@/services/bookingService';
import type { ServiceType } from '@/types/database';

const TODAY = new Date().toISOString().slice(0, 10);

export default function AgendarScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const params = useLocalSearchParams<{ chefId: string; chefName: string; dailyRate: string }>();
  const chefId = params.chefId ?? '';
  const chefName = params.chefName ?? 'Chef';
  const dailyRate = parseFloat(params.dailyRate ?? '0');

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>('diaria');
  const [address, setAddress] = useState('');
  const [guests, setGuests] = useState('2');
  const [booking, setBooking] = useState(false);

  const isFormReady = Boolean(selectedDate && address.trim() && parseInt(guests, 10) >= 1);

  useEffect(() => {
    let active = true;
    Promise.all([getChefAvailableDates(chefId), getChefBookedDates(chefId)]).then(([avail, booked]) => {
      if (active) {
        setAvailableDates(avail);
        setBookedDates(booked);
        setLoadingDates(false);
      }
    });
    return () => { active = false; };
  }, [chefId]);

  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};
    for (const d of availableDates) {
      marks[d] = { marked: true, dotColor: c.primary };
    }
    for (const d of bookedDates) {
      marks[d] = { marked: true, dotColor: c.danger, disabled: true, disableTouchEvent: true };
    }
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] ?? {}),
        selected: true,
        selectedColor: c.primary,
        dotColor: '#fff',
      };
    }
    return marks;
  }, [availableDates, bookedDates, selectedDate, c.primary, c.danger]);

  const handleDayPress = (day: { dateString: string }) => {
    if (day.dateString < TODAY) return;
    if (bookedDates.includes(day.dateString)) {
      Alert.alert('Data reservada', 'Este dia já tem um agendamento confirmado. Escolha outra data.');
      return;
    }
    if (availableDates.length > 0 && !availableDates.includes(day.dateString)) {
      Alert.alert('Data indisponível', 'O chef não marcou este dia como disponível. Escolha um dia com ponto verde.');
      return;
    }
    setSelectedDate(day.dateString);
  };

  const handleConfirmar = async () => {
    if (!selectedDate) {
      Alert.alert('Selecione uma data', 'Toque em um dia disponível no calendário.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Endereço obrigatório', 'Informe o endereço do evento.');
      return;
    }
    const guestsNum = parseInt(guests, 10);
    if (!guestsNum || guestsNum < 1) {
      Alert.alert('Convidados', 'Informe um número válido de convidados.');
      return;
    }
    try {
      setBooking(true);
      const r = await createBooking({
        chefId,
        dailyRate,
        eventDate: selectedDate,
        guestsCount: guestsNum,
        address: address.trim(),
        serviceType,
      });
      Alert.alert(
        'Solicitação enviada!',
        r.mock
          ? 'Em modo demonstração, veja o pedido na aba Agenda.'
          : 'O chef receberá seu pedido. Acompanhe em Agenda.',
        [{ text: 'Ver agenda', onPress: () => router.push('/agenda' as Href) }, { text: 'OK' }],
      );
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível agendar.');
    } finally {
      setBooking(false);
    }
  };

  const calendarTheme = useMemo(
    () => ({
      calendarBackground: c.card,
      dayTextColor: c.cream,
      textDisabledColor: c.hint,
      monthTextColor: c.cream,
      arrowColor: c.primary,
      todayTextColor: c.primary,
      selectedDayBackgroundColor: c.primary,
      selectedDayTextColor: '#fff',
      dotColor: c.primary,
      textDayFontFamily: brandFont,
      textMonthFontFamily: brandFont,
      textDayHeaderFontFamily: brandFont,
    }),
    [c],
  );

  return (
    <ScreenGradient>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <FontAwesome name="chevron-left" size={18} color={c.cream} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>AGENDAR SERVIÇO</Text>
          <Text style={styles.headerSub}>{chefName}</Text>
        </View>
        <View style={{ width: 18 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Escolha uma data</Text>
        {loadingDates ? (
          <View style={styles.calendarLoader}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <>
            {availableDates.length === 0 && (
              <Text style={styles.hint}>
                Nenhuma data cadastrada pelo chef — qualquer data futura será aceita.
              </Text>
            )}
            <View style={styles.legend}>
              <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: c.primary }]} /><Text style={styles.legendText}>Disponível</Text></View>
              <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: c.danger }]} /><Text style={styles.legendText}>Reservado</Text></View>
            </View>
            <Panel style={styles.calendarPanel}>
              <Calendar
                minDate={TODAY}
                markedDates={markedDates}
                onDayPress={handleDayPress}
                theme={calendarTheme}
                enableSwipeMonths
              />
            </Panel>
          </>
        )}

        {selectedDate && (
          <View style={styles.selectedBadge}>
            <FontAwesome name="check-circle" size={14} color={c.success} />
            <Text style={styles.selectedText}>
              {formatDate(selectedDate)}
            </Text>
          </View>
        )}

        <Text style={styles.section}>Tipo de serviço</Text>
        <View style={styles.typeRow}>
          {(['diaria', 'evento'] as ServiceType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, serviceType === t && { borderColor: c.primary, backgroundColor: c.card }]}
              onPress={() => setServiceType(t)}
            >
              <FontAwesome name={t === 'diaria' ? 'sun-o' : 'glass'} size={16} color={serviceType === t ? c.primary : c.muted} />
              <Text style={[styles.typeBtnText, serviceType === t && { color: c.primary }]}>
                {t === 'diaria' ? 'Diária' : 'Evento'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Endereço do evento</Text>
        <TextInput
          style={styles.input}
          placeholder="Rua, número, bairro, cidade"
          placeholderTextColor={c.hint}
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.section}>Número de convidados</Text>
        <TextInput
          style={[styles.input, styles.inputSmall]}
          placeholder="Ex: 10"
          placeholderTextColor={c.hint}
          value={guests}
          onChangeText={setGuests}
          keyboardType="numeric"
          maxLength={4}
        />

        <Panel style={styles.pricePanel}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Diária do chef</Text>
            <Text style={styles.priceValue}>R$ {dailyRate.toFixed(2)}</Text>
          </View>
          <View style={[styles.priceRow, styles.priceTotalRow]}>
            <Text style={styles.priceTotalLabel}>TOTAL</Text>
            <Text style={styles.priceTotalValue}>R$ {dailyRate.toFixed(2)}</Text>
          </View>
        </Panel>

        <AccentButton
          label="CONFIRMAR AGENDAMENTO"
          icon="check"
          onPress={handleConfirmar}
          loading={booking}
          disabled={!isFormReady}
          style={styles.cta}
        />
      </ScrollView>
    </ScreenGradient>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: GSpacing.screen,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerText: { flex: 1, alignItems: 'center' },
    headerTitle: {
      fontSize: 11,
      letterSpacing: 2,
      fontWeight: '700',
      color: c.primary,
      textTransform: 'uppercase',
    },
    headerSub: { fontSize: 14, color: c.cream, marginTop: 2 },
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 48 },
    section: {
      fontSize: 11,
      color: c.primary,
      letterSpacing: 2,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginTop: 24,
      marginBottom: 12,
    },
    calendarLoader: { height: 300, justifyContent: 'center', alignItems: 'center' },
    hint: { fontSize: 13, color: c.muted, marginBottom: 12, lineHeight: 18 },
    legend: { flexDirection: 'row', gap: 18, marginBottom: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: c.muted },
    calendarPanel: { overflow: 'hidden', padding: 0 },
    selectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.success,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    selectedText: { fontSize: 14, color: c.cream, fontWeight: '600' },
    typeRow: { flexDirection: 'row', gap: 12 },
    typeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    typeBtnText: { fontSize: 14, color: c.muted, fontWeight: '600' },
    input: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      color: c.cream,
    },
    inputSmall: { width: 120 },
    pricePanel: { marginTop: 24, gap: 10 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    priceLabel: { fontSize: 14, color: c.muted },
    priceValue: { fontSize: 14, color: c.cream },
    priceTotalRow: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 },
    priceTotalLabel: { fontSize: 13, letterSpacing: 1.5, fontWeight: '700', color: c.primary },
    priceTotalValue: { fontSize: 18, fontWeight: '700', color: c.primary, fontFamily: brandFont },
    cta: { marginTop: 28 },
  });
