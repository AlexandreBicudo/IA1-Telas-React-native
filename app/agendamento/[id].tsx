import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { getBookingById, updateBookingStatus, type BookingDetail } from '@/services/bookingService';
import { getOrCreateConversation, getMessages, sendMessage, subscribeToMessages, type ChatMessage } from '@/services/messageService';
import type { BookingStatus } from '@/types/database';

const STATUS_UI: Record<BookingStatus, { label: string; icon: string }> = {
  solicitado:    { label: 'Aguardando confirmação', icon: 'clock-o' },
  confirmado:    { label: 'Confirmado',             icon: 'check-circle' },
  em_andamento:  { label: 'Em andamento',           icon: 'cutlery' },
  concluido:     { label: 'Concluído',              icon: 'star' },
  cancelado:     { label: 'Cancelado',              icon: 'times-circle' },
};

function statusColor(status: BookingStatus, c: Palette) {
  const map: Record<BookingStatus, string> = {
    solicitado: c.warning, confirmado: c.success, em_andamento: c.primary,
    concluido: c.muted, cancelado: c.danger,
  };
  return map[status];
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
  const scrollRef = useRef<ScrollView>(null);

  // Carrega booking
  useEffect(() => {
    let active = true;
    getBookingById(bookingId).then((b) => {
      if (active) { setBooking(b); setLoadingBooking(false); }
    });
    return () => { active = false; };
  }, [bookingId]);

  // Carrega conversa + mensagens
  useEffect(() => {
    if (!bookingId) return;
    let unsub: () => void = () => {};
    getOrCreateConversation(bookingId).then((cid) => {
      if (!cid) return;
      setConvId(cid);
      getMessages(cid).then(setMessages);
      unsub = subscribeToMessages(cid, (msg) => {
        setMessages((prev) => [...prev, msg]);
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

  const handleSend = async () => {
    if (!convId || !msgText.trim()) return;
    const text = msgText.trim();
    setMsgText('');
    try {
      setSending(true);
      await sendMessage(convId, text);
      // Otimistic update (Realtime pode não estar ativado)
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

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
      <ScreenGradient style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <FontAwesome name="chevron-left" size={18} color={c.cream} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CONTRATO</Text>
          <View style={[styles.statusPill, { borderColor: sc }]}>
            <FontAwesome name={sv.icon as any} size={10} color={sc} />
            <Text style={[styles.statusText, { color: sc }]}>{sv.label}</Text>
          </View>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Partes */}
          <Panel style={styles.card}>
            <Row icon="user-circle-o" label={role === 'client' ? 'CHEF' : 'CLIENTE'} value={role === 'client' ? booking.chefName : booking.clientName} styles={styles} c={c} bold />
            {role === 'chef' && <Row icon="user" label="CLIENTE" value={booking.clientName} styles={styles} c={c} />}
          </Panel>

          {/* Detalhes */}
          <Panel style={styles.card}>
            <Row icon="calendar" label="DATA" value={fmtDate(booking.eventDate)} styles={styles} c={c} />
            <Row icon="cutlery" label="TIPO" value={booking.serviceType === 'diaria' ? 'Diária' : 'Evento'} styles={styles} c={c} />
            <Row icon="users" label="CONVIDADOS" value={`${booking.guestsCount} pessoas`} styles={styles} c={c} />
            <Row icon="map-marker" label="LOCAL" value={booking.address} styles={styles} c={c} />
            {booking.notes ? <Row icon="sticky-note-o" label="OBSERVAÇÕES" value={booking.notes} styles={styles} c={c} /> : null}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>TOTAL</Text>
              <Text style={styles.priceValue}>R$ {booking.totalPrice.toFixed(2)}</Text>
            </View>
          </Panel>

          {/* Ações */}
          {actioning ? (
            <ActivityIndicator color={c.primary} style={{ marginBottom: 16 }} />
          ) : (
            <View style={styles.actions}>
              {role === 'chef' && booking.status === 'solicitado' && (
                <>
                  <ActionBtn label="Recusar" color={c.danger} onPress={() => handleAction('cancelado')} styles={styles} />
                  <ActionBtn label="Aceitar" color={c.success} onPress={() => handleAction('confirmado')} styles={styles} />
                </>
              )}
              {role === 'chef' && booking.status === 'confirmado' && (
                <ActionBtn label="Concluir serviço" color={c.primary} onPress={() => handleAction('concluido')} styles={styles} />
              )}
              {role === 'client' && (booking.status === 'solicitado' || booking.status === 'confirmado') && (
                <ActionBtn label="Cancelar agendamento" color={c.danger} onPress={() => handleAction('cancelado')} styles={styles} />
              )}
            </View>
          )}

          {/* Chat */}
          <Text style={styles.chatTitle}>MENSAGENS</Text>
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

function Row({ icon, label, value, styles, c, bold }: { icon: any; label: string; value: string; styles: any; c: Palette; bold?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <FontAwesome name={icon} size={14} color={c.primary} style={{ width: 18 }} />
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, bold && { fontWeight: '700', fontSize: 16 }]}>{value}</Text>
      </View>
    </View>
  );
}

function ActionBtn({ label, color, onPress, styles }: { label: string; color: string; onPress: () => void; styles: any }) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { borderColor: color }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: GSpacing.screen,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTitle: { fontSize: 13, letterSpacing: 2, fontWeight: '700', color: c.cream, fontFamily: brandFont },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 11, fontWeight: '600' },
    scroll: { paddingHorizontal: GSpacing.screen, paddingBottom: 8 },
    card: { marginBottom: 12 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    detailText: { flex: 1 },
    detailLabel: { fontSize: 10, color: c.primary, letterSpacing: 1.5, fontWeight: '600' },
    detailValue: { fontSize: 14, color: c.cream, marginTop: 2 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, marginTop: 4 },
    priceLabel: { fontSize: 11, color: c.primary, letterSpacing: 2, fontWeight: '700' },
    priceValue: { fontSize: 20, fontWeight: '700', color: c.primary, fontFamily: brandFont },
    actions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actionBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    actionBtnText: { fontSize: 14, fontWeight: '700' },
    chatTitle: { fontSize: 11, color: c.primary, letterSpacing: 2, fontWeight: '600', textTransform: 'uppercase', marginBottom: 14 },
    muted: { fontSize: 14, color: c.muted },
    bubble: { maxWidth: '80%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
    bubbleMine: { alignSelf: 'flex-end', backgroundColor: c.primary },
    bubbleOther: { alignSelf: 'flex-start', backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    senderName: { fontSize: 11, color: c.primary, fontWeight: '600', marginBottom: 3 },
    bubbleText: { fontSize: 14, color: c.cream, lineHeight: 20 },
    bubbleTextMine: { color: '#fff' },
    bubbleTime: { fontSize: 10, color: c.muted, marginTop: 4, alignSelf: 'flex-end' },
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
  });
