import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useColors } from '@/components/theme-context';
import { Panel, ScreenGradient } from '@/components/ui-gourmet';
import { GSpacing, brandFont, type Palette } from '@/constants/gourmet-theme';
import { daysBetween, getBookingById, updateBookingStatus, type BookingDetail } from '@/services/bookingService';
import { getOrCreateConversation, getMessages, sendMessage, subscribeToMessages, type ChatMessage } from '@/services/messageService';
import { createReview, hasReviewed } from '@/services/reviewService';
import type { BookingStatus } from '@/types/database';

const STATUS_UI: Record<BookingStatus, { label: string; icon: string }> = {
  solicitado:    { label: 'Aguardando confirmação', icon: 'clock-o' },
  confirmado:    { label: 'Confirmado',             icon: 'check-circle' },
  em_andamento:  { label: 'Em andamento',           icon: 'cutlery' },
  concluido:     { label: 'Concluído',              icon: 'star' },
  cancelado:     { label: 'Cancelado',              icon: 'times-circle' },
};

// Passos exibidos na barra de progresso (inclui etapa virtual de pagamento)
const PROGRESS_STEPS = [
  { key: 'solicitado',  label: 'Pedido'    },
  { key: 'confirmado',  label: 'Aceito'    },
  { key: 'pagamento',   label: 'Pagamento' },
  { key: 'servico',     label: 'Serviço'   },
  { key: 'concluido',   label: 'Concluído' },
] as const;

function getProgressIdx(status: BookingStatus, paymentStatus?: string): number {
  switch (status) {
    case 'solicitado':   return 0;
    case 'confirmado':   return paymentStatus === 'pago' ? 2 : 1;
    case 'em_andamento': return 3;
    case 'concluido':    return 4;
    default:             return -1;
  }
}

function statusColor(status: BookingStatus, c: Palette) {
  const map: Record<BookingStatus, string> = {
    solicitado: c.warning, confirmado: c.success, em_andamento: c.primary,
    concluido: c.primary, cancelado: c.danger,
  };
  return map[status];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export default function AgendamentoDetailScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const params = useLocalSearchParams<{ id: string; role: string }>();
  const bookingId = params.id ?? '';
  const role = (params.role ?? 'client') as 'client' | 'chef';

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Refresh ao focar a tela — garante que mudanças de status feitas pelo outro
  // lado (ex: chef marca como concluído) apareçam sem precisar reiniciar o app.
  const loadData = useCallback(() => {
    let active = true;
    setLoadingBooking(true);
    Promise.all([getBookingById(bookingId), hasReviewed(bookingId)]).then(([b, alreadyReviewed]) => {
      if (active) { setBooking(b); setReviewed(alreadyReviewed); setLoadingBooking(false); }
    });
    return () => { active = false; };
  }, [bookingId]);

  useFocusEffect(loadData);

  useEffect(() => {
    if (!bookingId) return;
    let unsub: () => void = () => {};
    getOrCreateConversation(bookingId).then((cid) => {
      if (!cid) return;
      setConvId(cid);
      getMessages(cid).then(setMessages);
      unsub = subscribeToMessages(cid, (msg) => {
        setMessages((prev) => {
          // Remove o otimista (local-*) se chegou o real com mesmo conteúdo
          const base = msg.isMine
            ? prev.filter((m) => !(m.id.startsWith('local-') && m.content === msg.content))
            : prev;
          // Ignora se já existe pelo id (proteção contra reconexão)
          if (base.some((m) => m.id === msg.id)) return base;
          return [...base, msg];
        });
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      });
    });
    return () => unsub();
  }, [bookingId]);

  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  useEffect(() => { if (messages.length > 0) scrollToEnd(); }, [messages.length]);

  const handleAction = (status: BookingStatus) => {
    const labels: Partial<Record<BookingStatus, string>> = {
      confirmado: 'Aceitar este agendamento?',
      cancelado: role === 'chef' ? 'Recusar este pedido?' : 'Cancelar este agendamento?',
      concluido: 'Marcar como concluído?',
    };
    Alert.alert(labels[status] ?? 'Confirmar?', undefined, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: status === 'cancelado' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setActioning(true);
            await updateBookingStatus(bookingId, status);
            setBooking((prev) => prev ? { ...prev, status } : prev);
          } catch {
            Alert.alert('Erro', 'Não foi possível atualizar.');
          } finally {
            setActioning(false);
          }
        },
      },
    ]);
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0 || !booking) return;
    try {
      setSubmittingReview(true);
      const isReviewingChef = role === 'client';
      await createReview({
        bookingId,
        revieweeId: isReviewingChef ? booking.chefProfileId : booking.clientId,
        chefId: isReviewingChef ? booking.chefId : undefined,
        rating: reviewRating,
        comment: reviewComment,
      });
      // Atualiza o estado imediatamente sem aguardar o próximo focus
      setReviewed(true);
      setShowReviewModal(false);
      Alert.alert('Avaliação enviada!', 'Obrigado pelo seu feedback.');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível enviar a avaliação.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSend = async () => {
    if (!convId || !msgText.trim()) return;
    const text = msgText.trim();
    setMsgText('');
    try {
      setSending(true);
      await sendMessage(convId, text);
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, senderId: 'me', senderName: 'Você', content: text, createdAt: new Date().toISOString(), isMine: true },
      ]);
      scrollToEnd();
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  if (loadingBooking) {
    return (
      <ScreenGradient>
        <View style={styles.center}><ActivityIndicator color={c.primary} /></View>
      </ScreenGradient>
    );
  }
  if (!booking) {
    return (
      <ScreenGradient>
        <View style={styles.center}><Text style={styles.muted}>Agendamento não encontrado.</Text></View>
      </ScreenGradient>
    );
  }

  const sc = statusColor(booking.status, c);
  const sv = STATUS_UI[booking.status];
  const isCancelled = booking.status === 'cancelado';
  const paymentStatus = (booking as any).paymentStatus as string | undefined;
  const paymentMethod = (booking as any).paymentMethod as string | undefined;
  const currentStepIdx = getProgressIdx(booking.status, paymentStatus);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>

      {/* Modal de avaliação */}
      <Modal visible={showReviewModal} transparent animationType="fade" onRequestClose={() => setShowReviewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={styles.modalTitle}>Avaliar {role === 'client' ? booking?.chefName : booking?.clientName}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setReviewRating(n)} hitSlop={8}>
                  <FontAwesome name={n <= reviewRating ? 'star' : 'star-o'} size={36} color={c.primary} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.reviewInput, { backgroundColor: c.dark, borderColor: c.border, color: c.cream }]}
              placeholder="Comentário (opcional)"
              placeholderTextColor={c.hint}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: c.border }]} onPress={() => setShowReviewModal(false)}>
                <Text style={[styles.modalBtnText, { color: c.muted }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: c.primary, borderColor: c.primary, opacity: reviewRating === 0 ? 0.4 : 1 }]}
                onPress={handleSubmitReview}
                disabled={reviewRating === 0 || submittingReview}
              >
                {submittingReview ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.modalBtnText, { color: '#fff' }]}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScreenGradient style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <FontAwesome name="chevron-left" size={18} color={c.cream} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CONTRATO</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Faixa de status */}
        <View style={[styles.statusBanner, { backgroundColor: sc + '18', borderBottomColor: sc + '50' }]}>
          <FontAwesome name={sv.icon as any} size={14} color={sc} />
          <Text style={[styles.statusBannerText, { color: sc }]}>{sv.label.toUpperCase()}</Text>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Card das partes contratantes */}
          <Panel style={styles.partiesCard}>
            <Text style={[styles.sectionLabel, { marginBottom: 16 }]}>PARTES DO CONTRATO</Text>
            <View style={styles.partiesRow}>
              <PartyBubble name={booking.clientName} label="CLIENTE" color={c.primary} textColor={c.onPrimary} c={c} />
              <View style={[styles.partiesSep, { borderColor: c.border }]}>
                <FontAwesome name="exchange" size={13} color={c.hint} />
              </View>
              <PartyBubble name={booking.chefName} label="CHEF" color={c.success} textColor="#fff" c={c} />
            </View>
          </Panel>

          {/* Barra de progresso (inclui etapa de pagamento) */}
          {!isCancelled && (
            <View style={styles.progressWrap}>
              <View style={styles.progressBar}>
                {PROGRESS_STEPS.map((step, idx) => {
                  const done = idx <= currentStepIdx;
                  const active = idx === currentStepIdx;
                  const stepColor = done ? c.primary : c.border;
                  return (
                    <React.Fragment key={step.key}>
                      <View style={[styles.progressDot, { backgroundColor: stepColor, borderColor: stepColor,
                        transform: [{ scale: active ? 1.3 : 1 }] }]}>
                        {done && !active && <FontAwesome name="check" size={8} color={c.onPrimary} />}
                      </View>
                      {idx < PROGRESS_STEPS.length - 1 && (
                        <View style={[styles.progressLine, { backgroundColor: idx < currentStepIdx ? c.primary : c.border }]} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
              <View style={styles.progressLabels}>
                {PROGRESS_STEPS.map((step, idx) => (
                  <Text key={step.key} style={[styles.progressLabel, idx <= currentStepIdx && { color: c.primary }]}>
                    {step.label}
                  </Text>
                ))}
              </View>
              {booking.status === 'confirmado' && (
                <View style={[styles.progressHintRow, {
                  backgroundColor: paymentStatus === 'pago' ? c.success + '15' : c.warning + '15',
                  borderColor: paymentStatus === 'pago' ? c.success + '50' : c.warning + '50',
                }]}>
                  <FontAwesome
                    name={paymentStatus === 'pago' ? 'check-circle' : 'clock-o'}
                    size={13}
                    color={paymentStatus === 'pago' ? c.success : c.warning}
                  />
                  <Text style={[styles.progressHintText, { color: paymentStatus === 'pago' ? c.success : c.warning }]}>
                    {paymentStatus === 'pago' ? 'Pagamento confirmado' : 'Aguardando pagamento'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Detalhes do agendamento */}
          <Panel style={styles.card}>
            <Text style={styles.sectionLabel}>DETALHES DO SERVIÇO</Text>
            <DetailRow icon="file-text-o" label="CONTRATO CRIADO EM" value={fmtDateTime(booking.contractDate)} c={c} styles={styles} />
            {booking.eventEndDate && booking.eventEndDate.slice(0, 10) !== booking.eventDate.slice(0, 10) ? (
              <>
                <DetailRow icon="calendar" label="DATA DE INÍCIO" value={fmtDate(booking.eventDate)} c={c} styles={styles} />
                <DetailRow icon="calendar-check-o" label="DATA DE TÉRMINO" value={fmtDate(booking.eventEndDate)} c={c} styles={styles} />
                <DetailRow icon="clock-o" label="DURAÇÃO" value={`${daysBetween(booking.eventDate.slice(0, 10), booking.eventEndDate.slice(0, 10))} dias`} c={c} styles={styles} />
              </>
            ) : (
              <DetailRow icon="calendar" label="DATA DO EVENTO" value={fmtDate(booking.eventDate)} c={c} styles={styles} />
            )}
            <DetailRow icon="cutlery" label="TIPO" value={booking.serviceType === 'diaria' ? 'Diária' : 'Evento especial'} c={c} styles={styles} />
            <DetailRow icon="users" label="CONVIDADOS" value={`${booking.guestsCount} pessoa${booking.guestsCount !== 1 ? 's' : ''}`} c={c} styles={styles} />
            <DetailRow icon="map-marker" label="LOCAL" value={booking.address} c={c} styles={styles} />
            {booking.notes ? <DetailRow icon="sticky-note-o" label="OBSERVAÇÕES" value={booking.notes} c={c} styles={styles} /> : null}
          </Panel>

          {/* Callout do preço total */}
          <View style={[styles.priceCallout, { backgroundColor: c.primary + '14', borderColor: c.primary + '50' }]}>
            <Text style={[styles.priceCalloutLabel, { color: c.primary }]}>VALOR TOTAL DO SERVIÇO</Text>
            <Text style={[styles.priceCalloutValue, { color: c.primary }]}>
              R$ {booking.totalPrice.toFixed(2)}
            </Text>
          </View>

          {/* Seção de pagamento */}
          {!isCancelled && booking.status !== 'solicitado' && (
            <Panel style={styles.card}>
              <Text style={styles.sectionLabel}>PAGAMENTO</Text>

              {/* Callout colorido de status */}
              <View style={[styles.payStatusCallout, {
                backgroundColor: paymentStatus === 'pago' ? c.success + '18' : c.warning + '14',
                borderColor:     paymentStatus === 'pago' ? c.success + '60' : c.warning + '55',
              }]}>
                <View style={[styles.payStatusIconWrap, {
                  backgroundColor: paymentStatus === 'pago' ? c.success + '28' : c.warning + '28',
                }]}>
                  <FontAwesome
                    name={paymentStatus === 'pago' ? 'check-circle' : 'clock-o'}
                    size={28}
                    color={paymentStatus === 'pago' ? c.success : c.warning}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.payStatusTitle, { color: paymentStatus === 'pago' ? c.success : c.warning }]}>
                    {paymentStatus === 'pago' ? 'Pagamento confirmado' : 'Aguardando pagamento'}
                  </Text>
                  <Text style={[styles.payStatusSub, { color: paymentStatus === 'pago' ? c.success + 'cc' : c.warning + 'cc' }]}>
                    {paymentStatus === 'pago'
                      ? 'Valor recebido com sucesso'
                      : role === 'client'
                        ? 'Toque em "Pagar agora" abaixo'
                        : 'O cliente ainda não realizou o pagamento'}
                  </Text>
                </View>
                {paymentStatus === 'pago' && (
                  <View style={[styles.paidBadge, { backgroundColor: c.success + '20', borderColor: c.success + '50' }]}>
                    <Text style={[styles.paidBadgeText, { color: c.success }]}>PAGO</Text>
                  </View>
                )}
              </View>

              {/* Método de pagamento */}
              {paymentMethod && (
                <View style={[styles.payInfoRow, { marginTop: 12 }]}>
                  <View style={[styles.payIconWrap, { backgroundColor: c.primary + '18' }]}>
                    <FontAwesome name={paymentMethod === 'pix' ? 'qrcode' : 'credit-card'} size={14} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payInfoLabel}>MÉTODO</Text>
                    <Text style={styles.payInfoValue}>
                      {paymentMethod === 'pix' ? 'PIX' : paymentMethod === 'cartao' ? 'Cartão de crédito' : paymentMethod}
                    </Text>
                  </View>
                </View>
              )}
            </Panel>
          )}

          {/* Ações */}
          {actioning ? (
            <ActivityIndicator color={c.primary} style={{ marginBottom: 16 }} />
          ) : (
            <View style={styles.actions}>
              {role === 'chef' && booking.status === 'solicitado' && (
                <>
                  <ActionBtn label="Recusar" color={c.danger} onPress={() => handleAction('cancelado')} compact styles={styles} />
                  <ActionBtn label="Aceitar contrato" color={c.success} onPress={() => handleAction('confirmado')} compact styles={styles} />
                </>
              )}
              {role === 'chef' && booking.status === 'confirmado' && (
                <ActionBtn label="Concluir serviço" color={c.primary} onPress={() => handleAction('concluido')} styles={styles} />
              )}
              {role === 'client' && booking.status === 'confirmado' && (booking as any).paymentStatus !== 'pago' && (
                <ActionBtn label="Pagar agora" color={c.success} onPress={() => router.push(`/pagamento/${bookingId}` as any)} styles={styles} />
              )}
              {role === 'client' && (booking.status === 'solicitado' || booking.status === 'confirmado') && (
                <ActionBtn label="Cancelar agendamento" color={c.danger} onPress={() => handleAction('cancelado')} styles={styles} />
              )}
            </View>
          )}

          {/* Avaliação */}
          {booking.status === 'concluido' && (
            reviewed ? (
              <View style={styles.reviewedBadge}>
                <FontAwesome name="star" size={14} color={c.primary} />
                <Text style={styles.reviewedText}>Você já avaliou este serviço</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.reviewBtn} onPress={() => { setReviewRating(0); setReviewComment(''); setShowReviewModal(true); }} activeOpacity={0.8}>
                <FontAwesome name="star-o" size={16} color={c.primary} />
                <Text style={styles.reviewBtnText}>Avaliar {role === 'client' ? 'o Chef' : 'o Cliente'}</Text>
              </TouchableOpacity>
            )
          )}

          {/* Chat */}
          <View style={[styles.chatHeader, { borderTopColor: c.border }]}>
            <FontAwesome name="comments" size={14} color={c.primary} />
            <Text style={styles.chatTitle}>MENSAGENS</Text>
          </View>
          {messages.length === 0 ? (
            <Text style={styles.muted}>Nenhuma mensagem ainda. Diga olá!</Text>
          ) : (
            messages.map((msg) => (
              <View key={msg.id} style={[styles.bubble, msg.isMine ? styles.bubbleMine : styles.bubbleOther]}>
                {!msg.isMine && <Text style={styles.senderName}>{msg.senderName || 'Chef'}</Text>}
                <Text style={[styles.bubbleText, msg.isMine && styles.bubbleTextMine]}>{msg.content}</Text>
                <Text style={[styles.bubbleTime, msg.isMine && { color: 'rgba(255,255,255,0.6)' }]}>{fmtTime(msg.createdAt)}</Text>
              </View>
            ))
          )}
          <View style={{ height: 12 }} />
        </ScrollView>

        {/* Input de mensagem */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Escreva uma mensagem…"
            placeholderTextColor={c.hint}
            value={msgText}
            onChangeText={setMsgText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, (!msgText.trim() || sending) && styles.sendBtnDisabled]} onPress={handleSend} disabled={!msgText.trim() || sending}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <FontAwesome name="send" size={16} color="#fff" />}
          </TouchableOpacity>
        </View>
      </ScreenGradient>
    </KeyboardAvoidingView>
  );
}

// ---------- Componentes auxiliares ----------

function PartyBubble({ name, label, color, textColor, c }: { name: string; label: string; color: string; textColor: string; c: Palette }) {
  const initials = getInitials(name);
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: color + '22',
                     borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Text style={{ color, fontWeight: '700', fontSize: 19, fontFamily: brandFont }}>{initials}</Text>
      </View>
      <Text style={{ fontSize: 9, color, letterSpacing: 1.5, fontWeight: '700', marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 14, color: c.cream, fontWeight: '600', textAlign: 'center' }} numberOfLines={2}>{name}</Text>
    </View>
  );
}

function DetailRow({ icon, label, value, styles, c }: { icon: any; label: string; value: string; styles: any; c: Palette }) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconWrap, { backgroundColor: c.primary + '18' }]}>
        <FontAwesome name={icon} size={13} color={c.primary} />
      </View>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionBtn({ label, color, onPress, compact, styles }: { label: string; color: string; onPress: () => void; compact?: boolean; styles: any }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: color }, compact && styles.actionBtnCompact]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.actionBtnText, { color }, compact && styles.actionBtnTextCompact]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Formata uma data sem deslocamento de fuso — lê YYYY-MM-DD diretamente. */
function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

/** Formata data + hora a partir de um ISO completo (usa hora local do dispositivo). */
function fmtDateTime(iso: string) {
  const dt = new Date(iso);
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' às ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ---------- Estilos ----------

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: GSpacing.screen,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTitle: { fontSize: 13, letterSpacing: 3, fontWeight: '700', color: c.cream, fontFamily: brandFont },

    // Status banner
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    statusBannerText: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },

    // Scroll
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 8, paddingTop: 16 },

    // Parties card
    partiesCard: { marginBottom: 12, paddingVertical: 20 },
    partiesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    partiesSep: {
      width: 34, height: 34, borderRadius: 17,
      borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    },

    // Progress bar
    progressWrap: { marginBottom: 12, paddingHorizontal: 8 },
    progressBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      marginBottom: 6,
    },
    progressDot: {
      width: 20, height: 20, borderRadius: 10,
      borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center',
    },
    progressLine: { flex: 1, height: 2, marginHorizontal: 4 },
    progressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    progressLabel: { fontSize: 9, color: c.border, fontWeight: '600', textAlign: 'center', width: 48 },
    progressHintRow: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      marginTop: 10, borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'center',
    },
    progressHintText: { fontSize: 12, fontWeight: '700' },

    // Payment info
    payStatusCallout: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 0,
    },
    payStatusIconWrap: {
      width: 56, height: 56, borderRadius: 28,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    payStatusTitle: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
    payStatusSub: { fontSize: 12, lineHeight: 16 },
    payInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    payIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    payInfoLabel: { fontSize: 10, color: c.primary, letterSpacing: 1.5, fontWeight: '600', marginBottom: 2 },
    payInfoValue: { fontSize: 14, color: c.cream },
    paidBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
    paidBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },

    // Section label
    sectionLabel: { fontSize: 10, color: c.primary, letterSpacing: 2, fontWeight: '700', marginBottom: 14 },

    // Details card
    card: { marginBottom: 12 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    detailIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    detailText: { flex: 1, justifyContent: 'center' },
    detailLabel: { fontSize: 10, color: c.primary, letterSpacing: 1.5, fontWeight: '600', marginBottom: 2 },
    detailValue: { fontSize: 14, color: c.cream, lineHeight: 20 },

    // Price callout
    priceCallout: {
      borderWidth: 1,
      borderRadius: GSpacing.radius,
      padding: 20,
      marginBottom: 16,
      alignItems: 'center',
    },
    priceCalloutLabel: { fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 8 },
    priceCalloutValue: { fontSize: 36, fontWeight: '700', fontFamily: brandFont },

    // Actions
    actions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actionBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    actionBtnText: { fontSize: 14, fontWeight: '700' },
    actionBtnCompact: { paddingVertical: 9, borderWidth: 1, borderRadius: 8 },
    actionBtnTextCompact: { fontSize: 12, fontWeight: '600' },

    // Review
    reviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: c.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16, justifyContent: 'center' },
    reviewBtnText: { fontSize: 15, fontWeight: '700', color: c.primary },
    reviewedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card, borderWidth: 1, borderColor: c.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 16 },
    reviewedText: { fontSize: 14, color: c.primary, fontWeight: '600' },

    // Chat
    chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, paddingTop: 18, marginTop: 4, marginBottom: 14 },
    chatTitle: { fontSize: 11, color: c.primary, letterSpacing: 2, fontWeight: '600', textTransform: 'uppercase' },
    muted: { fontSize: 14, color: c.muted },
    bubble: { maxWidth: '80%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
    bubbleMine: { alignSelf: 'flex-end', backgroundColor: c.primary },
    bubbleOther: { alignSelf: 'flex-start', backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    senderName: { fontSize: 11, color: c.primary, fontWeight: '600', marginBottom: 3 },
    bubbleText: { fontSize: 14, color: c.cream, lineHeight: 20 },
    bubbleTextMine: { color: '#fff' },
    bubbleTime: { fontSize: 10, color: c.muted, marginTop: 4, alignSelf: 'flex-end' },

    // Input
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: GSpacing.screen,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.dark,
    },
    input: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: c.cream,
      maxHeight: 100,
    },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { opacity: 0.4 },

    // Modal de avaliação
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalBox: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 24 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: c.cream, textAlign: 'center', marginBottom: 20 },
    starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
    reviewInput: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 80, fontSize: 14, marginBottom: 20 },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    modalBtnText: { fontSize: 14, fontWeight: '700' },
  });
