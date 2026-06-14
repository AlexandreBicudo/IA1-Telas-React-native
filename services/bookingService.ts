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

export interface BookingDetail extends BookingListItem {
  clientId: string;
  chefProfileId: string; // chef_profiles.profile_id (auth uid do chef)
  notes?: string;
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
  eventDate: string; // 'YYYY-MM-DD'
  guestsCount: number;
  address: string;
  serviceType: ServiceType;
}): Promise<{ mock: boolean }> {
  if (!isSupabaseConfigured) {
    await delay();
    return { mock: true };
  }
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Faça login para agendar.');

  // Bloqueia double-booking: verifica se já existe agendamento ativo nessa data
  const dayStart = `${params.eventDate}T00:00:00`;
  const dayEnd = `${params.eventDate}T23:59:59`;
  const { count } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', params.chefId)
    .gte('event_date', dayStart)
    .lte('event_date', dayEnd)
    .in('status', ['solicitado', 'confirmado', 'em_andamento']);
  if ((count ?? 0) > 0) {
    throw new Error('O chef já tem um agendamento nesta data. Escolha outro dia.');
  }

  const { error } = await supabase.from('bookings').insert({
    client_id: auth.user.id,
    chef_id: params.chefId,
    service_type: params.serviceType,
    event_date: new Date(params.eventDate).toISOString(),
    guests_count: params.guestsCount,
    address: params.address,
    total_price: params.dailyRate,
    status: 'solicitado',
  });
  if (error) throw error;

  // Marca o slot de disponibilidade como reservado (se existir)
  await supabase
    .from('chef_availability')
    .update({ is_booked: true })
    .eq('chef_id', params.chefId)
    .eq('date', params.eventDate);

  return { mock: false };
}

/** Carrega um agendamento pelo ID com detalhes completos. */
export async function getBookingById(id: string): Promise<BookingDetail | null> {
  if (!isSupabaseConfigured) {
    const all = [...MOCK.asClient, ...MOCK.asChef];
    const found = all.find((b) => b.id === id);
    if (!found) return null;
    return { ...found, clientId: 'mock-user', chefProfileId: 'mock-chef-profile' };
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data } = await supabase
    .from('bookings')
    .select(`
      id, client_id, chef_id, service_type, event_date,
      guests_count, address, notes, total_price, status,
      chef_profiles ( profile_id, profiles ( full_name ) ),
      client:profiles!bookings_client_id_fkey ( full_name )
    `)
    .eq('id', id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    clientId: data.client_id,
    chefId: data.chef_id,
    chefProfileId: (data.chef_profiles as any)?.profile_id ?? '',
    chefName: (data.chef_profiles as any)?.profiles?.full_name ?? 'Chef',
    clientName: (data.client as any)?.full_name ?? 'Cliente',
    serviceType: data.service_type,
    eventDate: data.event_date,
    guestsCount: data.guests_count,
    address: data.address,
    notes: data.notes ?? undefined,
    totalPrice: Number(data.total_price),
    status: data.status,
  };
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
