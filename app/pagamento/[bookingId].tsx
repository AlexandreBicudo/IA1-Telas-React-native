import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { useColors } from '@/components/theme-context';
import { GoldButton, Panel, ScreenGradient } from '@/components/ui-gourmet';
import { GSpacing, brandFont, type Palette } from '@/constants/gourmet-theme';
import { getBookingById } from '@/services/bookingService';
import {
  confirmPayment,
  createPixPayment,
  getPaymentStatus,
  type PixPaymentResult,
} from '@/services/paymentService';

type Tab = 'pix' | 'cartao';

type PayState = 'idle' | 'loading' | 'awaiting' | 'paid' | 'error';

const PIX_EXPIRY_MINUTES = 30;

export default function PagamentoScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const [tab, setTab] = useState<Tab>('pix');
  const [totalPrice, setTotalPrice] = useState(0);
  const [chefName, setChefName] = useState('');
  const [loadingBooking, setLoadingBooking] = useState(true);

  // PIX
  const [pixData, setPixData] = useState<PixPaymentResult | null>(null);
  const [payState, setPayState] = useState<PayState>('idle');
  const [secondsLeft, setSecondsLeft] = useState(PIX_EXPIRY_MINUTES * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardInstallments, setCardInstallments] = useState(1);
  const [processingCard, setProcessingCard] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    getBookingById(bookingId).then((b) => {
      if (b) { setTotalPrice(b.totalPrice); setChefName(b.chefName); }
      setLoadingBooking(false);
    });
  }, [bookingId]);

  // Inicia a geração do PIX ao entrar na aba
  const handleGeneratePix = async () => {
    try {
      setPayState('loading');
      const result = await createPixPayment(
        bookingId ?? '',
        totalPrice,
        `SeuChefe Gourmet — serviço com ${chefName}`,
      );
      setPixData(result);
      setSecondsLeft(PIX_EXPIRY_MINUTES * 60);
      setPayState('awaiting');
      startTimer(result.paymentId);
    } catch (e) {
      setPayState('error');
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível gerar o PIX.');
    }
  };

  const startTimer = (paymentId: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPayState('error');
          return 0;
        }
        return prev - 1;
      });
      // Polling leve a cada 10s para checar se o gateway confirmou
      if (Date.now() % 10000 < 1100) {
        try {
          const status = await getPaymentStatus(bookingId ?? '');
          if (status?.status === 'pago') {
            clearInterval(timerRef.current!);
            setPayState('paid');
          }
        } catch { /* polling silencioso */ }
      }
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleCopyPix = async () => {
    if (!pixData?.qrCode) return;
    await Clipboard.setStringAsync(pixData.qrCode);
    Alert.alert('Copiado!', 'Código PIX copiado para a área de transferência.');
  };

  const handleConfirmPixManually = async () => {
    if (!pixData) return;
    Alert.alert(
      'Confirmar pagamento?',
      'Use esta opção apenas se o pagamento foi realizado e o status não atualizou automaticamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await confirmPayment(bookingId ?? '', pixData.paymentId);
              setPayState('paid');
              if (timerRef.current) clearInterval(timerRef.current);
            } catch (e) {
              Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível confirmar.');
            }
          },
        },
      ],
    );
  };

  const handleCardPay = async () => {
    if (!cardNumber.trim() || !cardName.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      Alert.alert('Atenção', 'Preencha todos os dados do cartão.');
      return;
    }
    Alert.alert(
      'Pagar com cartão',
      `Confirmar pagamento de R$ ${totalPrice.toFixed(2)} em ${cardInstallments}x?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pagar',
          onPress: async () => {
            try {
              setProcessingCard(true);
              // Em modo real, chamaríamos createCardPayment com o token MP.
              // Aqui simulamos a confirmação imediata (modo mock).
              await confirmPayment(bookingId ?? '', `card-${Date.now()}`);
              setPayState('paid');
            } catch (e) {
              Alert.alert('Pagamento recusado', e instanceof Error ? e.message : 'Tente novamente ou use outro cartão.');
            } finally {
              setProcessingCard(false);
            }
          },
        },
      ],
    );
  };

  const fmtTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (loadingBooking) {
    return (
      <ScreenGradient>
        <View style={styles.center}><ActivityIndicator color={c.primary} /></View>
      </ScreenGradient>
    );
  }

  if (payState === 'paid') {
    return (
      <ScreenGradient>
        <View style={styles.header}>
          <View style={{ width: 30 }} />
          <Text style={styles.headerTitle}>PAGAMENTO</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={styles.center}>
          <View style={[styles.statusIcon, { backgroundColor: c.success + '20', borderColor: c.success }]}>
            <FontAwesome name="check" size={40} color={c.success} />
          </View>
          <Text style={[styles.statusTitle, { color: c.cream }]}>Pagamento confirmado!</Text>
          <Text style={[styles.statusBody, { color: c.muted }]}>
            Seu pagamento de{' '}
            <Text style={{ color: c.primary, fontWeight: '700' }}>R$ {totalPrice.toFixed(2)}</Text>
            {' '}foi confirmado. O chef foi notificado.
          </Text>
          <GoldButton label="Ver contrato" onPress={() => router.replace(`/agendamento/${bookingId}?role=client` as any)} style={{ width: '100%' }} />
        </View>
      </ScreenGradient>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScreenGradient style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <FontAwesome name="chevron-left" size={18} color={c.cream} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PAGAMENTO</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Valor */}
        <View style={[styles.priceBar, { backgroundColor: c.primary + '14', borderColor: c.primary + '40' }]}>
          <Text style={[styles.priceLabel, { color: c.primary }]}>TOTAL A PAGAR</Text>
          <Text style={[styles.priceValue, { color: c.primary }]}>R$ {totalPrice.toFixed(2)}</Text>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: c.card, borderColor: c.border }]}>
          <TabBtn label="PIX" icon="qrcode" active={tab === 'pix'} onPress={() => setTab('pix')} c={c} styles={styles} />
          <TabBtn label="Cartão" icon="credit-card" active={tab === 'cartao'} onPress={() => setTab('cartao')} c={c} styles={styles} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── ABA PIX ── */}
          {tab === 'pix' && (
            <>
              {payState === 'idle' && (
                <Panel style={styles.card}>
                  <View style={styles.pixIdle}>
                    <FontAwesome name="qrcode" size={60} color={c.primary} />
                    <Text style={[styles.pixIdleTitle, { color: c.cream }]}>Pagar com PIX</Text>
                    <Text style={[styles.pixIdleBody, { color: c.muted }]}>
                      O QR Code é válido por {PIX_EXPIRY_MINUTES} minutos. Abra o app do seu banco e escaneie.
                    </Text>
                    <GoldButton label="Gerar QR Code" onPress={handleGeneratePix} style={{ width: '100%' }} />
                  </View>
                </Panel>
              )}

              {payState === 'loading' && (
                <View style={[styles.center, { marginTop: 60 }]}>
                  <ActivityIndicator size="large" color={c.primary} />
                  <Text style={[styles.pixIdleBody, { color: c.muted, marginTop: 16 }]}>Gerando QR Code…</Text>
                </View>
              )}

              {payState === 'awaiting' && pixData && (
                <Panel style={styles.card}>
                  {/* Timer */}
                  <View style={[styles.timerRow, { backgroundColor: secondsLeft < 60 ? c.danger + '15' : c.card }]}>
                    <FontAwesome name="clock-o" size={14} color={secondsLeft < 60 ? c.danger : c.primary} />
                    <Text style={[styles.timerText, { color: secondsLeft < 60 ? c.danger : c.primary }]}>
                      Expira em {fmtTimer(secondsLeft)}
                    </Text>
                  </View>

                  {/* QR code (imagem base64) */}
                  {pixData.qrCodeBase64 ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${pixData.qrCodeBase64}` }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={[styles.qrPlaceholder, { backgroundColor: c.card, borderColor: c.border }]}>
                      <FontAwesome name="qrcode" size={80} color={c.primary} />
                    </View>
                  )}

                  <Text style={[styles.pixCopyLabel, { color: c.muted }]}>Ou use o código Pix Copia e Cola:</Text>
                  <TouchableOpacity
                    style={[styles.copyBox, { backgroundColor: c.card, borderColor: c.border }]}
                    onPress={handleCopyPix}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.copyCode, { color: c.cream }]} numberOfLines={2} ellipsizeMode="middle">
                      {pixData.qrCode}
                    </Text>
                    <FontAwesome name="copy" size={16} color={c.primary} />
                  </TouchableOpacity>

                  <GoldButton label="Copiar código PIX" onPress={handleCopyPix} style={{ marginTop: 4 }} />
                  <TouchableOpacity style={styles.manualBtn} onPress={handleConfirmPixManually}>
                    <Text style={[styles.manualBtnText, { color: c.muted }]}>Já paguei — confirmar manualmente</Text>
                  </TouchableOpacity>
                </Panel>
              )}

              {payState === 'error' && (
                <Panel style={styles.card}>
                  <View style={styles.pixIdle}>
                    <FontAwesome name="times-circle" size={48} color={c.danger} />
                    <Text style={[styles.pixIdleTitle, { color: c.cream }]}>QR Code expirado</Text>
                    <Text style={[styles.pixIdleBody, { color: c.muted }]}>
                      O tempo limite foi atingido. Gere um novo QR Code para continuar.
                    </Text>
                    <GoldButton label="Gerar novo QR Code" onPress={handleGeneratePix} style={{ width: '100%' }} />
                  </View>
                </Panel>
              )}
            </>
          )}

          {/* ── ABA CARTÃO ── */}
          {tab === 'cartao' && (
            <Panel style={styles.card}>
              <Text style={styles.cardSectionLabel}>DADOS DO CARTÃO</Text>

              <LabeledInput
                label="Número do cartão"
                value={cardNumber}
                onChange={(t) => setCardNumber(t.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                placeholder="0000 0000 0000 0000"
                keyboardType="numeric"
                maxLength={19}
                c={c} styles={styles}
              />
              <LabeledInput
                label="Nome no cartão"
                value={cardName}
                onChange={setCardName}
                placeholder="Como impresso no cartão"
                autoCapitalize="characters"
                c={c} styles={styles}
              />
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="Validade"
                    value={cardExpiry}
                    onChange={(t) => {
                      const d = t.replace(/\D/g, '');
                      setCardExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2, 4)}` : d);
                    }}
                    placeholder="MM/AA"
                    keyboardType="numeric"
                    maxLength={5}
                    c={c} styles={styles}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="CVV"
                    value={cardCvv}
                    onChange={(t) => setCardCvv(t.replace(/\D/g, ''))}
                    placeholder="000"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    c={c} styles={styles}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginBottom: 8 }]}>PARCELAMENTO</Text>
              <View style={styles.installmentsRow}>
                {[1, 2, 3, 6, 12].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.installmentChip,
                      { borderColor: cardInstallments === n ? c.primary : c.border,
                        backgroundColor: cardInstallments === n ? c.primary + '18' : 'transparent' }]}
                    onPress={() => setCardInstallments(n)}
                  >
                    <Text style={[styles.installmentText, { color: cardInstallments === n ? c.primary : c.muted }]}>
                      {n}x {n > 1 ? `R$ ${(totalPrice / n).toFixed(2)}` : 'à vista'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <GoldButton
                label={processingCard ? 'Processando…' : `Pagar R$ ${totalPrice.toFixed(2)}`}
                onPress={handleCardPay}
                disabled={processingCard}
                style={{ marginTop: 8 }}
              />
              {processingCard && <ActivityIndicator color={c.primary} style={{ marginTop: 12 }} />}

              <View style={[styles.notice, { backgroundColor: c.primary + '10', borderColor: c.primary + '35' }]}>
                <FontAwesome name="lock" size={12} color={c.primary} />
                <Text style={[styles.noticeText, { color: c.muted }]}>
                  Pagamento processado com segurança via Mercado Pago. Seus dados não são armazenados em nossos servidores.
                </Text>
              </View>
            </Panel>
          )}
        </ScrollView>
      </ScreenGradient>
    </KeyboardAvoidingView>
  );
}

// ─── Componentes auxiliares ────────────────────────────────────────────────

function TabBtn({ label, icon, active, onPress, c, styles }: {
  label: string; icon: string; active: boolean; onPress: () => void; c: Palette; styles: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <FontAwesome name={icon as any} size={14} color={active ? c.primary : c.muted} />
      <Text style={[styles.tabText, { color: active ? c.primary : c.muted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function LabeledInput({ label, value, onChange, placeholder, keyboardType, maxLength, secureTextEntry, autoCapitalize, c, styles }: {
  label: string; value: string; onChange: (t: string) => void; placeholder?: string;
  keyboardType?: any; maxLength?: number; secureTextEntry?: boolean; autoCapitalize?: any;
  c: Palette; styles: any;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.inputLabel}>{label.toUpperCase()}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.dark, borderColor: c.border, color: c.cream }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.hint}
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'none'}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: GSpacing.screen, gap: 16 },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: GSpacing.screen, paddingTop: 16, paddingBottom: 12,
    },
    headerTitle: { fontSize: 13, letterSpacing: 3, fontWeight: '700', color: c.cream, fontFamily: brandFont },

    priceBar: {
      marginHorizontal: GSpacing.screen, borderWidth: 1, borderRadius: GSpacing.radius,
      padding: 14, alignItems: 'center', marginBottom: 12,
    },
    priceLabel: { fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
    priceValue: { fontSize: 32, fontWeight: '700', fontFamily: brandFont },

    tabs: {
      flexDirection: 'row',
      marginHorizontal: GSpacing.screen,
      borderWidth: 1,
      borderRadius: GSpacing.radius,
      marginBottom: 12,
      overflow: 'hidden',
    },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
    tabText: { fontSize: 14, fontWeight: '600' },

    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 32 },
    card: { marginBottom: 16 },

    // PIX idle
    pixIdle: { alignItems: 'center', gap: 14, paddingVertical: 10 },
    pixIdleTitle: { fontSize: 20, fontWeight: '700', fontFamily: brandFont },
    pixIdleBody: { fontSize: 14, lineHeight: 22, textAlign: 'center' },

    // Timer
    timerRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderRadius: 8, padding: 10, marginBottom: 16, justifyContent: 'center',
    },
    timerText: { fontSize: 16, fontWeight: '700' },

    // QR
    qrImage: { width: '100%', height: 240, borderRadius: GSpacing.radius, marginBottom: 16 },
    qrPlaceholder: {
      width: '100%', height: 240, borderWidth: 1,
      borderRadius: GSpacing.radius, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },

    // Copia e cola
    pixCopyLabel: { fontSize: 12, marginBottom: 8 },
    copyBox: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 10, padding: 12, gap: 10, marginBottom: 12,
    },
    copyCode: { flex: 1, fontSize: 11, lineHeight: 16 },

    manualBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    manualBtnText: { fontSize: 13 },

    // Cartão
    cardSectionLabel: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '700', marginBottom: 16 },
    cardRow: { flexDirection: 'row', gap: 12 },
    inputLabel: { fontSize: 10, color: c.primary, letterSpacing: 1.5, fontWeight: '600', marginBottom: 6 },
    input: {
      borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
      paddingVertical: 12, fontSize: 15,
    },
    installmentsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    installmentChip: {
      borderWidth: 1.5, borderRadius: 8,
      paddingVertical: 7, paddingHorizontal: 10,
    },
    installmentText: { fontSize: 12, fontWeight: '600' },

    notice: {
      flexDirection: 'row', alignItems: 'flex-start',
      gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12,
    },
    noticeText: { flex: 1, fontSize: 12, lineHeight: 18 },

    // Status paid
    statusIcon: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    statusTitle: { fontSize: 24, fontWeight: '700', fontFamily: brandFont, textAlign: 'center' },
    statusBody: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
  });
