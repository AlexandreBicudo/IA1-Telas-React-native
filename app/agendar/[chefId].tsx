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
import { calculateEventPrice, createBooking, daysBetween } from '@/services/bookingService';
import { getChefById } from '@/services/chefService';
import type { ChefListing, PricingTier, ServiceType } from '@/types/database';

const TODAY = new Date().toISOString().slice(0, 10);

interface DateSuggestion {
  startDate: string;
  endDate: string;
  totalPrice: number;
  savings: number; // vs preço sem desconto
}

/** Gera sugestões de faixas de datas consecutivas disponíveis. */
function buildSuggestions(
  availableDates: string[],
  bookedDates: string[],
  duration: number,
  pricingTiers: PricingTier[] | null | undefined,
  dailyRate: number,
): DateSuggestion[] {
  if (duration < 1 || availableDates.length < duration) return [];
  const valid = [...availableDates]
    .filter((d) => d >= TODAY && !bookedDates.includes(d))
    .sort();
  if (valid.length < duration) return [];

  const results: DateSuggestion[] = [];
  for (let i = 0; i <= valid.length - duration; i++) {
    let consecutive = true;
    for (let j = 1; j < duration; j++) {
      const prev = new Date(valid[i + j - 1]);
      const curr = new Date(valid[i + j]);
      if (Math.round((curr.getTime() - prev.getTime()) / 86400000) !== 1) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) {
      const totalPrice = calculateEventPrice(pricingTiers, dailyRate, duration);
      const fullPrice = dailyRate * duration;
      results.push({
        startDate: valid[i],
        endDate: valid[i + duration - 1],
        totalPrice,
        savings: fullPrice - totalPrice,
      });
    }
  }
  return results.sort((a, b) => a.totalPrice - b.totalPrice).slice(0, 3);
}

export default function AgendarScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const params = useLocalSearchParams<{ chefId: string; chefName: string; dailyRate: string }>();
  const chefId = params.chefId ?? '';
  const chefNameFallback = params.chefName ?? 'Chef';
  const dailyRateFallback = parseFloat(params.dailyRate ?? '0');

  const [chef, setChef] = useState<ChefListing | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);

  // Seleção diária (1 data)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Seleção evento (faixa de datas)
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [selectingEnd, setSelectingEnd] = useState(false);

  // Sugestão de datas
  const [desiredDuration, setDesiredDuration] = useState(2);

  const [serviceType, setServiceType] = useState<ServiceType>('diaria');

  // Campos de endereço separados
  const [addrRua, setAddrRua] = useState('');
  const [addrNumero, setAddrNumero] = useState('');
  const [addrBairro, setAddrBairro] = useState('');
  const [addrCidade, setAddrCidade] = useState('');
  const [addrUF, setAddrUF] = useState('');
  const [addrCEP, setAddrCEP] = useState('');
  const [addrRef, setAddrRef] = useState('');

  const [guests, setGuests] = useState('2');
  const [booking, setBooking] = useState(false);

  const effectiveDailyRate = chef?.dailyRate ?? dailyRateFallback;
  const pricingTiers = chef?.pricingTiers;
  const chefName = chef?.name ?? chefNameFallback;

  useEffect(() => {
    let active = true;
    Promise.all([
      getChefById(chefId),
      getChefAvailableDates(chefId),
      getChefBookedDates(chefId),
    ]).then(([chefData, avail, booked]) => {
      if (!active) return;
      setChef(chefData);
      setAvailableDates(avail);
      setBookedDates(booked);
      setLoadingDates(false);
    });
    return () => { active = false; };
  }, [chefId]);

  // Reset de seleção ao mudar tipo de serviço
  useEffect(() => {
    setSelectedDate(null);
    setStartDate(null);
    setEndDate(null);
    setSelectingEnd(false);
  }, [serviceType]);

  // Sincroniza duração com as datas selecionadas (para sugestões)
  useEffect(() => {
    if (startDate && endDate) {
      setDesiredDuration(daysBetween(startDate, endDate));
    }
  }, [startDate, endDate]);

  // ─── Cálculo de preço ────────────────────────────────────────────────────

  const numDays = useMemo(() => {
    if (serviceType === 'diaria') return 1;
    if (startDate && endDate) return daysBetween(startDate, endDate);
    return desiredDuration;
  }, [serviceType, startDate, endDate, desiredDuration]);

  const totalPrice = useMemo(
    () => calculateEventPrice(pricingTiers, effectiveDailyRate, numDays),
    [pricingTiers, effectiveDailyRate, numDays],
  );

  const fullPrice = effectiveDailyRate * numDays;
  const hasPricingDiscount = totalPrice < fullPrice;

  // ─── Sugestões de datas ─────────────────────────────────────────────────

  const suggestions = useMemo(() => {
    if (serviceType !== 'evento' || desiredDuration < 1) return [];
    return buildSuggestions(availableDates, bookedDates, desiredDuration, pricingTiers, effectiveDailyRate);
  }, [serviceType, desiredDuration, availableDates, bookedDates, pricingTiers, effectiveDailyRate]);

  // ─── Marcação do calendário ──────────────────────────────────────────────

  const markingType = serviceType === 'evento' ? 'period' : 'dot';

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    if (serviceType === 'diaria') {
      for (const d of availableDates) {
        marks[d] = { marked: true, dotColor: c.primary };
      }
      for (const d of bookedDates) {
        marks[d] = { marked: true, dotColor: c.danger, disabled: true, disableTouchEvent: true };
      }
      if (selectedDate) {
        marks[selectedDate] = { ...(marks[selectedDate] ?? {}), selected: true, selectedColor: c.primary, dotColor: '#fff' };
      }
    } else {
      // Periodo: disponíveis com fundo suave
      for (const d of availableDates) {
        if (!bookedDates.includes(d)) {
          marks[d] = { color: c.primary + '30', textColor: c.primary };
        }
      }
      for (const d of bookedDates) {
        marks[d] = { disabled: true, disableTouchEvent: true, color: c.danger + '25', textColor: c.danger };
      }

      if (startDate && endDate) {
        // Desenha o range
        const start = new Date(startDate);
        const end = new Date(endDate);
        const curr = new Date(start);
        while (curr <= end) {
          const ds = curr.toISOString().slice(0, 10);
          if (!bookedDates.includes(ds)) {
            const isFirst = ds === startDate;
            const isLast = ds === endDate;
            marks[ds] = {
              startingDay: isFirst,
              endingDay: isLast,
              color: (isFirst || isLast) ? c.primary : c.primary + '90',
              textColor: '#fff',
            };
          }
          curr.setDate(curr.getDate() + 1);
        }
      } else if (startDate) {
        marks[startDate] = { startingDay: true, endingDay: true, color: c.primary, textColor: '#fff' };
      }
    }

    return marks;
  }, [availableDates, bookedDates, selectedDate, startDate, endDate, serviceType, c]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleDayPress = (day: { dateString: string }) => {
    const date = day.dateString;
    if (date < TODAY) return;
    if (bookedDates.includes(date)) {
      Alert.alert('Data reservada', 'Este dia já tem um agendamento confirmado. Escolha outra data.');
      return;
    }
    if (availableDates.length > 0 && !availableDates.includes(date)) {
      Alert.alert('Data indisponível', 'O chef não marcou este dia como disponível. Escolha um dia com destaque.');
      return;
    }

    if (serviceType === 'diaria') {
      setSelectedDate(date);
    } else {
      if (!selectingEnd) {
        setStartDate(date);
        setEndDate(null);
        setSelectingEnd(true);
      } else {
        if (date < startDate!) {
          setStartDate(date);
          setEndDate(null);
          setSelectingEnd(true);
        } else {
          setEndDate(date);
          setSelectingEnd(false);
        }
      }
    }
  };

  const applySuggestion = (s: DateSuggestion) => {
    setStartDate(s.startDate);
    setEndDate(s.endDate);
    setSelectingEnd(false);
  };

  const composedAddress = [
    addrRua.trim() + (addrNumero.trim() ? `, ${addrNumero.trim()}` : ''),
    addrBairro.trim(),
    addrCidade.trim() + (addrUF.trim() ? ` - ${addrUF.trim().toUpperCase()}` : ''),
    addrCEP.trim() ? `CEP ${addrCEP.trim()}` : '',
    addrRef.trim() ? `Ref: ${addrRef.trim()}` : '',
  ].filter(Boolean).join(', ');

  const isFormReady = useMemo(() => {
    if (!addrRua.trim() || !addrCidade.trim() || parseInt(guests, 10) < 1) return false;
    if (serviceType === 'diaria') return Boolean(selectedDate);
    return Boolean(startDate && endDate && endDate >= startDate);
  }, [addrRua, addrCidade, guests, serviceType, selectedDate, startDate, endDate]);

  const handleConfirmar = async () => {
    const eventDate = serviceType === 'diaria' ? selectedDate : startDate;
    if (!eventDate) {
      Alert.alert('Selecione uma data', 'Toque em um dia disponível no calendário.');
      return;
    }
    if (!addrRua.trim() || !addrCidade.trim()) {
      Alert.alert('Endereço incompleto', 'Preencha pelo menos a rua e a cidade do evento.');
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
        dailyRate: effectiveDailyRate,
        eventDate,
        eventEndDate: serviceType === 'evento' && endDate ? endDate : undefined,
        totalPrice,
        guestsCount: guestsNum,
        address: composedAddress,
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

  const calendarTheme = useMemo(() => ({
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
  }), [c]);

  // ─── Render ───────────────────────────────────────────────────────────────

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

        {/* Tipo de serviço */}
        <Text style={styles.section}>Tipo de serviço</Text>
        <View style={styles.typeRow}>
          {(['diaria', 'evento'] as ServiceType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, serviceType === t && { borderColor: c.primary, backgroundColor: c.card }]}
              onPress={() => setServiceType(t)}
            >
              <FontAwesome name={t === 'diaria' ? 'sun-o' : 'calendar'} size={16} color={serviceType === t ? c.primary : c.muted} />
              <Text style={[styles.typeBtnText, serviceType === t && { color: c.primary }]}>
                {t === 'diaria' ? 'Diária' : 'Evento (faixa de dias)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calendário */}
        <Text style={styles.section}>
          {serviceType === 'diaria' ? 'Escolha uma data' : 'Escolha o período do evento'}
        </Text>

        {serviceType === 'evento' && (
          <View style={styles.hintBadge}>
            <FontAwesome name="info-circle" size={13} color={c.primary} />
            <Text style={styles.hintText}>
              {!startDate
                ? 'Toque para selecionar a data de início'
                : !endDate
                  ? 'Agora selecione a data de término'
                  : `${formatDate(startDate)} → ${formatDate(endDate)} (${numDays} dias)`}
            </Text>
          </View>
        )}

        {loadingDates ? (
          <View style={styles.calendarLoader}><ActivityIndicator color={c.primary} /></View>
        ) : (
          <>
            {availableDates.length === 0 && (
              <Text style={styles.hint}>
                Nenhuma data cadastrada pelo chef — qualquer data futura será aceita.
              </Text>
            )}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: c.primary }]} />
                <Text style={styles.legendText}>Disponível</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: c.danger }]} />
                <Text style={styles.legendText}>Reservado</Text>
              </View>
              {serviceType === 'evento' && (
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: c.primary + '80', width: 20, borderRadius: 3 }]} />
                  <Text style={styles.legendText}>Período</Text>
                </View>
              )}
            </View>
            <Panel style={styles.calendarPanel}>
              <Calendar
                minDate={TODAY}
                markedDates={markedDates}
                markingType={markingType}
                onDayPress={handleDayPress}
                theme={calendarTheme}
                enableSwipeMonths
              />
            </Panel>
          </>
        )}

        {/* Badge data selecionada (diária) */}
        {serviceType === 'diaria' && selectedDate && (
          <View style={styles.selectedBadge}>
            <FontAwesome name="check-circle" size={14} color={c.success} />
            <Text style={styles.selectedText}>{formatDate(selectedDate)}</Text>
          </View>
        )}

        {/* Faixa de datas selecionada (evento) */}
        {serviceType === 'evento' && startDate && endDate && (
          <View style={styles.selectedBadge}>
            <FontAwesome name="check-circle" size={14} color={c.success} />
            <Text style={styles.selectedText}>
              {formatDate(startDate)} → {formatDate(endDate)}
            </Text>
            <Text style={[styles.selectedText, { color: c.primary, fontWeight: '700', marginLeft: 4 }]}>
              ({numDays} dias)
            </Text>
          </View>
        )}

        {/* ── Duração e sugestões (apenas modo evento) ── */}
        {serviceType === 'evento' && (
          <>
            {startDate && endDate ? (
              // Quando datas já foram selecionadas: mostra leitura automática
              <View style={styles.durationDisplay}>
                <FontAwesome name="calendar-check-o" size={15} color={c.success} />
                <Text style={styles.durationDisplayText}>
                  {numDays} {numDays === 1 ? 'dia' : 'dias'} de evento selecionados
                </Text>
              </View>
            ) : (
              // Quando nenhuma data selecionada: stepper para filtrar sugestões
              <>
                <Text style={[styles.section, { marginTop: 28 }]}>Sugerir datas para</Text>
                <Text style={styles.durationHint}>Ajuste o número de dias para ver sugestões disponíveis</Text>
                <View style={styles.durationRow}>
                  <TouchableOpacity style={styles.durationBtn}
                    onPress={() => setDesiredDuration((d) => Math.max(1, d - 1))} hitSlop={10}>
                    <FontAwesome name="minus" size={14} color={c.cream} />
                  </TouchableOpacity>
                  <Text style={styles.durationValue}>{desiredDuration} {desiredDuration === 1 ? 'dia' : 'dias'}</Text>
                  <TouchableOpacity style={styles.durationBtn}
                    onPress={() => setDesiredDuration((d) => d + 1)} hitSlop={10}>
                    <FontAwesome name="plus" size={14} color={c.cream} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {suggestions.length > 0 && !(startDate && endDate) && (
              <>
                <Text style={styles.section}>Datas sugeridas com melhor custo-benefício</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}
                  contentContainerStyle={styles.suggestionsContent}>
                  {suggestions.map((s, idx) => (
                    <TouchableOpacity key={idx} style={[styles.suggestionCard, idx === 0 && { borderColor: c.success }]}
                      onPress={() => applySuggestion(s)} activeOpacity={0.85}>
                      {idx === 0 && (
                        <View style={[styles.bestBadge, { backgroundColor: c.success }]}>
                          <Text style={styles.bestBadgeText}>MELHOR PREÇO</Text>
                        </View>
                      )}
                      <Text style={styles.suggestionDates}>
                        {formatDateShort(s.startDate)} → {formatDateShort(s.endDate)}
                      </Text>
                      <Text style={styles.suggestionPrice}>R$ {s.totalPrice.toFixed(0)}</Text>
                      {s.savings > 0 && (
                        <Text style={[styles.suggestionSavings, { color: c.success }]}>
                          Economia de R$ {s.savings.toFixed(0)}
                        </Text>
                      )}
                      <Text style={styles.suggestionCta}>Selecionar</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}

        {/* Endereço */}
        <Text style={styles.section}>
          {serviceType === 'diaria' ? 'Endereço do serviço' : 'Endereço do evento'}
        </Text>

        {/* CEP */}
        <Text style={styles.fieldLabel}>CEP</Text>
        <TextInput
          style={[styles.input, styles.inputCEP]}
          placeholder="00000-000"
          placeholderTextColor={c.hint}
          value={addrCEP}
          onChangeText={(v) => setAddrCEP(v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9))}
          keyboardType="numeric"
          maxLength={9}
        />

        {/* Rua + Número */}
        <View style={styles.addrRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Rua <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da rua ou avenida"
              placeholderTextColor={c.hint}
              value={addrRua}
              onChangeText={setAddrRua}
            />
          </View>
          <View style={styles.addrNumeroWrap}>
            <Text style={styles.fieldLabel}>Número</Text>
            <TextInput
              style={styles.input}
              placeholder="Nº"
              placeholderTextColor={c.hint}
              value={addrNumero}
              onChangeText={setAddrNumero}
              keyboardType="numeric"
              maxLength={6}
            />
          </View>
        </View>

        {/* Bairro */}
        <Text style={styles.fieldLabel}>Bairro</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome do bairro"
          placeholderTextColor={c.hint}
          value={addrBairro}
          onChangeText={setAddrBairro}
        />

        {/* Cidade + UF */}
        <View style={styles.addrRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Cidade <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Cidade"
              placeholderTextColor={c.hint}
              value={addrCidade}
              onChangeText={setAddrCidade}
            />
          </View>
          <View style={styles.addrUFWrap}>
            <Text style={styles.fieldLabel}>UF</Text>
            <TextInput
              style={[styles.input, { textAlign: 'center' }]}
              placeholder="SP"
              placeholderTextColor={c.hint}
              value={addrUF}
              onChangeText={(v) => setAddrUF(v.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
        </View>

        {/* Referência */}
        <Text style={styles.fieldLabel}>Referência <Text style={styles.fieldOptional}>(opcional)</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: próximo ao shopping, portão azul..."
          placeholderTextColor={c.hint}
          value={addrRef}
          onChangeText={setAddrRef}
        />

        {/* Convidados */}
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

        {/* Resumo de preço */}
        <Panel style={styles.pricePanel}>
          <Text style={styles.pricePanelTitle}>RESUMO DO VALOR</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Diária base do chef</Text>
            <Text style={styles.priceValue}>R$ {effectiveDailyRate.toFixed(2)}</Text>
          </View>
          {numDays > 1 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Número de dias</Text>
              <Text style={styles.priceValue}>× {numDays}</Text>
            </View>
          )}
          {hasPricingDiscount && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: c.success }]}>Desconto por volume</Text>
              <Text style={[styles.priceValue, { color: c.success }]}>− R$ {(fullPrice - totalPrice).toFixed(2)}</Text>
            </View>
          )}
          {pricingTiers && pricingTiers.length > 0 && numDays > 1 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { fontSize: 11, color: c.hint }]}>
                Tabela: R$ {(totalPrice / numDays).toFixed(0)}/dia × {numDays} dias
              </Text>
            </View>
          )}
          <View style={[styles.priceRow, styles.priceTotalRow]}>
            <Text style={styles.priceTotalLabel}>TOTAL</Text>
            <Text style={styles.priceTotalValue}>R$ {totalPrice.toFixed(2)}</Text>
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

function formatDateShort(iso: string) {
  const [, m, d] = iso.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${d} ${months[parseInt(m, 10) - 1]}`;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: GSpacing.screen, paddingTop: 16, paddingBottom: 12,
    },
    headerText: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 11, letterSpacing: 2, fontWeight: '700', color: c.primary, textTransform: 'uppercase' },
    headerSub: { fontSize: 14, color: c.cream, marginTop: 2 },
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 48 },
    section: {
      fontSize: 11, color: c.primary, letterSpacing: 2, fontWeight: '600',
      textTransform: 'uppercase', marginTop: 24, marginBottom: 12,
    },

    // Tipo de serviço
    typeRow: { flexDirection: 'row', gap: 12 },
    typeBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    },
    typeBtnText: { fontSize: 13, color: c.muted, fontWeight: '600' },

    // Hint período
    hintBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card,
      borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
      borderWidth: 1, borderColor: c.border,
    },
    hintText: { flex: 1, fontSize: 13, color: c.cream },

    // Calendário
    calendarLoader: { height: 300, justifyContent: 'center', alignItems: 'center' },
    hint: { fontSize: 13, color: c.muted, marginBottom: 12, lineHeight: 18 },
    legend: { flexDirection: 'row', gap: 14, marginBottom: 10, flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: c.muted },
    calendarPanel: { overflow: 'hidden', padding: 0 },

    // Data selecionada
    selectedBadge: {
      flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 12,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.success, borderRadius: 8,
      paddingHorizontal: 14, paddingVertical: 10,
    },
    selectedText: { fontSize: 14, color: c.cream, fontWeight: '600' },

    // Duração
    durationDisplay: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 4,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.success + '60',
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    },
    durationDisplayText: { fontSize: 15, fontWeight: '700', color: c.cream },
    durationHint: { fontSize: 12, color: c.muted, marginBottom: 10 },
    durationRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8, alignSelf: 'flex-start' },
    durationBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
    durationValue: { fontSize: 18, fontWeight: '700', color: c.cream, minWidth: 70, textAlign: 'center' },

    // Sugestões
    suggestionsScroll: { marginBottom: 4 },
    suggestionsContent: { gap: 12, paddingVertical: 4, paddingRight: 4 },
    suggestionCard: {
      width: 160, borderRadius: 12, borderWidth: 1.5, borderColor: c.border,
      backgroundColor: c.card, padding: 14, gap: 6,
    },
    bestBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 4 },
    bestBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1 },
    suggestionDates: { fontSize: 12, color: c.cream, fontWeight: '600' },
    suggestionPrice: { fontSize: 18, fontWeight: '700', color: c.primary, fontFamily: brandFont },
    suggestionSavings: { fontSize: 11, fontWeight: '600' },
    suggestionCta: { fontSize: 12, color: c.primary, fontWeight: '700', marginTop: 4 },

    // Inputs
    input: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: c.cream,
    },
    inputSmall: { width: 120 },
    inputCEP: { width: 140 },

    // Endereço
    fieldLabel: {
      fontSize: 11, color: c.primary, letterSpacing: 1.5, fontWeight: '600',
      textTransform: 'uppercase', marginTop: 14, marginBottom: 6,
    },
    required: { color: c.danger },
    fieldOptional: { color: c.hint, fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
    addrRow: { flexDirection: 'row', gap: 10 },
    addrNumeroWrap: { width: 90 },
    addrUFWrap: { width: 68 },

    // Painel de preço
    pricePanel: { marginTop: 24, gap: 8 },
    pricePanelTitle: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    priceLabel: { fontSize: 14, color: c.muted },
    priceValue: { fontSize: 14, color: c.cream },
    priceTotalRow: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10, marginTop: 4 },
    priceTotalLabel: { fontSize: 13, letterSpacing: 1.5, fontWeight: '700', color: c.primary },
    priceTotalValue: { fontSize: 20, fontWeight: '700', color: c.primary, fontFamily: brandFont },
    cta: { marginTop: 28 },
  });
