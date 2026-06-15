/**
 * Mensagens de chat ligadas a um agendamento (tabelas conversations + chat_messages).
 * Usa Supabase Realtime (postgres_changes) para entrega em tempo real.
 *
 * NOTA: Para o Realtime funcionar, habilite a tabela chat_messages em
 * Supabase Dashboard → Database → Replication → supabase_realtime.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isMine: boolean;
}

const MOCK_MESSAGES: ChatMessage[] = [
  { id: 'msg-1', senderId: 'chef-001', senderName: 'Chef', content: 'Olá! Confirmo o agendamento. Pode contar comigo.', createdAt: new Date(Date.now() - 7200000).toISOString(), isMine: false },
  { id: 'msg-2', senderId: 'mock-user', senderName: 'Você', content: 'Ótimo! O evento começa às 19h.', createdAt: new Date(Date.now() - 3600000).toISOString(), isMine: true },
  { id: 'msg-3', senderId: 'chef-001', senderName: 'Chef', content: 'Perfeito, estarei lá às 17h para preparar tudo.', createdAt: new Date(Date.now() - 1800000).toISOString(), isMine: false },
];

/** Obtém ou cria a conversa vinculada ao agendamento. Retorna o conversation_id. */
export async function getOrCreateConversation(bookingId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return `mock-conv-${bookingId}`;

  const { data: booking } = await supabase
    .from('bookings')
    .select('client_id, chef_id')
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking) return null;

  // Busca por booking_id para garantir que cada contrato tem seu próprio chat
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ client_id: booking.client_id, chef_id: booking.chef_id, booking_id: bookingId })
    .select('id')
    .single();

  if (error) {
    // Se falhou por conflito (constraint), tenta buscar a conversa que já existe
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('conversations')
        .select('id')
        .eq('booking_id', bookingId)
        .maybeSingle();
      if (retry) return retry.id;
    }
    throw error;
  }
  return created.id;
}

/** Lista as mensagens de uma conversa. */
export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || conversationId.startsWith('mock-')) return MOCK_MESSAGES;

  const { data: authData } = await supabase.auth.getUser();
  const myId = authData.user?.id ?? '';

  const { data } = await supabase
    .from('chat_messages')
    .select('id, sender_id, content, created_at, sender:profiles!chat_messages_sender_id_fkey ( full_name )')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return (data ?? []).map((r: any) => ({
    id: r.id,
    senderId: r.sender_id,
    senderName: r.sender?.full_name ?? 'Usuário',
    content: r.content,
    createdAt: r.created_at,
    isMine: r.sender_id === myId,
  }));
}

/** Envia uma mensagem na conversa. */
export async function sendMessage(conversationId: string, content: string): Promise<void> {
  if (!isSupabaseConfigured || conversationId.startsWith('mock-')) return;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error('Sessão expirada.');

  const { error } = await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    sender_id: authData.user.id,
    content: content.trim(),
  });
  if (error) throw error;
}

/** Assina novas mensagens em tempo real. Retorna função de cancelamento. */
export function subscribeToMessages(
  conversationId: string,
  onNew: (msg: ChatMessage, myId: string) => void,
): () => void {
  if (!isSupabaseConfigured || conversationId.startsWith('mock-')) return () => {};

  let myId = '';
  supabase.auth.getUser().then(({ data }) => { myId = data.user?.id ?? ''; });

  const channel = supabase
    .channel(`conv-${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        const r = payload.new as any;
        onNew({
          id: r.id,
          senderId: r.sender_id,
          senderName: '',
          content: r.content,
          createdAt: r.created_at,
          isMine: r.sender_id === myId,
        }, myId);
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
