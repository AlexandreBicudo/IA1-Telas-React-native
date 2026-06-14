/**
 * Agendamentos (bookings) — serviços contratados pelo cliente e recebidos pelo chef.
 *
 * Em modo mock devolve exemplos; com Supabase, lê/grava na tabela "bookings"
 * (protegida por RLS: cada parte só vê os próprios agendamentos).
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { BookingStatus, ServiceType } from '@/types/database';

export interface BookingListItem {
  id: string;
  chefId: string;
  chefName: string;
  clientName: string;
  serviceType: ServiceType;
  eventDate: string;
  guestsCount: number;
  address: string;
  totalPrice: number;
  status: BookingStatus;
}

export interface MyBookings {
  asClient: BookingListItem[]; // que eu contratei
  asChef: BookingListItem[]; // que recebi como profissional
}

const MOCK: MyBookings = {
  asClient: [
    {
      id: 'bk-1',
      chefId: 'chef-002',
      chefName: 'Rafael Tanaka',
      clientName: 'Você',
      serviceType: 'evento',
      eventDate: new Date(Date.now() + 6 * 86400000).toISOString(),
      guestsCount: 8,
      address: 'Rua das Acácias, 120',
      totalPrice: 520,
      status: 'confirmado',
    },
    {
      id: 'bk-2',
      chefId: 'chef-004',
      chefName: 'Henrique Salles',
      clientName: 'Você',
      serviceType: 'diaria',
      eventDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      guestsCount: 4,
      address: 'A combinar no chat',
      totalPrice: 600,
      status: 'solicitado',
    },
  ],
  asChef: [
    {
      id: 'bk-3',
      chefId: 'chef-001',
      chefName: 'Você',
      clientName: 'Marina Costa',
      serviceType: 'evento',
      eventDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      guestsCount: 12,
      address: 'Alameda dos Ipês, 45',
      totalPrice: 480,
      status: 'solicitado',
    },
  ],
};

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

/** Cria um pedido de agendamento (status inicial: solicitado). */
export async function createBooking(params: {
  chefId: string;
  dailyRate: number;
}): Promise<{ mock: boolean }> {
  if (!isSupabaseConfigured) {
    await delay();
    return { mock: true };
  }
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Faça login para agendar.');

  const eventDate = new Date(Date.now() + 7 * 86400000).toISOString();
  const { error } = await supabase.from('bookings').insert({
    client_id: auth.user.id,
    chef_id: params.chefId,
    service_type: 'diaria',
    event_date: eventDate,
    guests_count: 2,
    address: 'A combinar no chat',
    total_price: params.dailyRate,
    status: 'solicitado',
  });
  if (error) throw error;
  return { mock: false };
}

/** Atualiza o status de um agendamento (aceitar/recusar/cancelar). */
export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) throw error;
}

/** Carrega os agendamentos do usuário, separados por papel. */
export async function getMyBookings(): Promise<MyBookings> {
  if (!isSupabaseConfigured) {
    await delay();
    return MOCK;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { asClient: [], asChef: [] };

  // Como cliente: agendamentos que eu contratei (nome do chef vem do perfil).
  const { data: clientRows } = await supabase
    .from('bookings')
    .select(
      'id, chef_id, service_type, event_date, guests_count, address, total_price, status, chef_profiles ( profiles ( full_name ) )',
    )
    .eq('client_id', auth.user.id)
    .order('event_date', { ascending: true });

  // Como chef: preciso do meu chef_profile.
  const { data: myChef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('profile_id', auth.user.id)
    .maybeSingle();

  let chefRows: unknown[] = [];
  if (myChef?.id) {
    const { data } = await supabase
      .from('bookings')
      .select(
        'id, chef_id, service_type, event_date, guests_count, address, total_price, status, client:profiles!bookings_client_id_fkey ( full_name )',
      )
      .eq('chef_id', myChef.id)
      .order('event_date', { ascending: true });
    chefRows = data ?? [];
  }

  const mapClient = (r: any): BookingListItem => ({
    id: r.id,
    chefId: r.chef_id,
    chefName: r.chef_profiles?.profiles?.full_name ?? 'Chef',
    clientName: 'Você',
    serviceType: r.service_type,
    eventDate: r.event_date,
    guestsCount: r.guests_count,
    address: r.address,
    totalPrice: Number(r.total_price),
    status: r.status,
  });

  const mapChef = (r: any): BookingListItem => ({
    id: r.id,
    chefId: r.chef_id,
    chefName: 'Você',
    clientName: r.client?.full_name ?? 'Cliente',
    serviceType: r.service_type,
    eventDate: r.event_date,
    guestsCount: r.guests_count,
    address: r.address,
    totalPrice: Number(r.total_price),
    status: r.status,
  });

  return {
    asClient: (clientRows ?? []).map(mapClient),
    asChef: chefRows.map(mapChef),
  };
}
