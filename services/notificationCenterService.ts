import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { sendPushToToken, getPushToken, getChefPushToken } from './notificationService';

export type NotifType =
  | 'pedido_recebido'
  | 'pedido_aceito'
  | 'pedido_cancelado'
  | 'servico_concluido'
  | 'nova_avaliacao';

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  bookingId: string | null;
  read: boolean;
  createdAt: string;
}

const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', type: 'pedido_aceito', title: 'Pedido aceito!', body: 'Camila Andrade aceitou seu agendamento para 20/jun.', bookingId: null, read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'n2', type: 'pedido_recebido', title: 'Novo pedido!', body: 'Você recebeu uma solicitação de serviço para 25/jun.', bookingId: null, read: false, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'n3', type: 'servico_concluido', title: 'Serviço concluído', body: 'O serviço com Rafael Tanaka foi marcado como concluído.', bookingId: null, read: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
];

/** Retorna todas as notificações do usuário logado, mais recentes primeiro. */
export async function getMyNotifications(): Promise<AppNotification[]> {
  if (!isSupabaseConfigured) return MOCK_NOTIFICATIONS;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, booking_id, read, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data ?? []).map((r) => ({
    id: r.id,
    type: r.type as NotifType,
    title: r.title,
    body: r.body,
    bookingId: r.booking_id ?? null,
    read: r.read,
    createdAt: r.created_at,
  }));
}

/** Conta notificações não lidas. */
export async function getUnreadCount(): Promise<number> {
  if (!isSupabaseConfigured) return MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 0;

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .eq('read', false);

  return count ?? 0;
}

/** Marca uma notificação como lida. */
export async function markAsRead(notifId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('notifications').update({ read: true }).eq('id', notifId);
}

/** Marca todas as notificações do usuário como lidas. */
export async function markAllAsRead(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', auth.user.id).eq('read', false);
}

/** Deleta uma notificação pelo id. */
export async function deleteNotification(notifId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('notifications').delete().eq('id', notifId);
}

/** Cria uma notificação in-app + dispara push para um usuário (pelo profiles.id). */
export async function notifyUser(
  targetProfileId: string,
  type: NotifType,
  title: string,
  body: string,
  bookingId?: string,
): Promise<void> {
  if (!isSupabaseConfigured) return;

  await Promise.allSettled([
    supabase.from('notifications').insert({
      user_id: targetProfileId,
      type,
      title,
      body,
      booking_id: bookingId ?? null,
      read: false,
    }),
    getPushToken(targetProfileId).then((token) => {
      if (token) return sendPushToToken(token, title, body);
    }),
  ]);
}

/** Notifica o chef sobre novo pedido recebido. */
export async function notifyChefNewBooking(chefProfilesId: string, clientName: string, eventDate: string, bookingId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { data } = await supabase
    .from('chef_profiles')
    .select('profile_id')
    .eq('id', chefProfilesId)
    .maybeSingle();
  if (!data?.profile_id) return;

  const dateStr = new Date(eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  await notifyUser(
    data.profile_id,
    'pedido_recebido',
    'Novo pedido recebido!',
    `${clientName} solicitou seu serviço para ${dateStr}.`,
    bookingId,
  );
}

/** Notifica o chef quando o cliente cancela um contrato. */
export async function notifyChefBookingCancelled(chefId: string, clientName: string, eventDate: string, bookingId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { data } = await supabase
    .from('chef_profiles')
    .select('profile_id')
    .eq('id', chefId)
    .maybeSingle();
  if (!data?.profile_id) return;

  const dateStr = new Date(eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  await notifyUser(
    data.profile_id,
    'pedido_cancelado',
    'Contrato cancelado',
    `${clientName} cancelou o contrato para ${dateStr}.`,
    bookingId,
  );
}

/** Notifica o cliente sobre mudança de status do pedido. */
export async function notifyClientStatusChange(
  clientProfileId: string,
  chefName: string,
  newStatus: 'confirmado' | 'cancelado' | 'concluido',
  eventDate: string,
  bookingId: string,
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const dateStr = new Date(eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const messages: Record<string, { type: NotifType; title: string; body: string }> = {
    confirmado: { type: 'pedido_aceito',     title: 'Pedido aceito! 🎉',       body: `${chefName} aceitou seu agendamento para ${dateStr}.` },
    cancelado:  { type: 'pedido_cancelado',  title: 'Pedido recusado',         body: `${chefName} não pôde aceitar seu pedido para ${dateStr}.` },
    concluido:  { type: 'servico_concluido', title: 'Serviço concluído ✅',    body: `${chefName} marcou o serviço de ${dateStr} como concluído. Deixe uma avaliação!` },
  };

  const msg = messages[newStatus];
  if (!msg) return;

  await notifyUser(clientProfileId, msg.type, msg.title, msg.body, bookingId);
}
