/**
 * Agendamentos (bookings) — serviços contratados pelo cliente e recebidos pelo chef.
 *
 * Em modo mock devolve exemplos; com Supabase, lê/grava na tabela "bookings"
 * (protegida por RLS: cada parte só vê os próprios agendamentos).
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { notifyChefBookingCancelled, notifyChefNewBooking, notifyClientStatusChange } from '@/services/notificationCenterService';
import type { BookingStatus, PricingTier, ServiceType } from '@/types/database';

/**
 * Calcula o preço total considerando tabela de preços dinâmica por faixa de dias.
 * Se não há tabela de preços, usa dailyRate * numDays.
 */
export function calculateEventPrice(
  pricingTiers: PricingTier[] | null | undefined,
  dailyRate: number,
  numDays: number,
): number {
  if (!pricingTiers || pricingTiers.length === 0) return dailyRate * numDays;
  const tier = pricingTiers.find(
    (t) => numDays >= t.minDays && (t.maxDays === null || numDays <= t.maxDays),
  );
  return (tier?.ratePerDay ?? dailyRate) * numDays;
}

/** Dias entre duas datas ISO (inclusive nas duas pontas). */
export function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export interface BookingListItem {
  id: string;
  chefId: string;
  chefName: string;
  clientName: string;
  serviceType: ServiceType;
  eventDate: string;
  createdAt: string;
  guestsCount: number;
  address: string;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus?: string; // 'pendente' | 'pago' | 'estornado'
  counterpartAvatarUrl?: string;
}

export interface ChefEarningsSummary {
  totalThisMonth: number;
  totalLastMonth: number;
  completedJobs: number;
  pendingJobs: number;
  avgRating: number;
  weeklyData: { label: string; value: number }[];   // últimos 7 dias
  monthlyData: { label: string; value: number }[];  // últimos 6 meses
  yearlyData: { label: string; value: number }[];   // últimos 12 meses
  recentJobs: { id: string; clientName: string; date: string; amount: number; avatarUrl?: string }[];
}

export interface BookingDetail extends BookingListItem {
  clientId: string;
  chefProfileId: string; // chef_profiles.profile_id (auth uid do chef)
  contractDate: string;  // quando o pedido foi criado (created_at)
  eventEndDate?: string; // data fim para eventos multi-dia
  notes?: string;
  paymentStatus?: string; // 'pendente' | 'pago' | 'estornado'
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
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
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
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
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
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      guestsCount: 12,
      address: 'Alameda dos Ipês, 45',
      totalPrice: 480,
      status: 'solicitado',
    },
    {
      id: 'bk-4',
      chefId: 'chef-001',
      chefName: 'Você',
      clientName: 'João Pereira',
      serviceType: 'evento',
      eventDate: new Date(Date.now() - 9 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      guestsCount: 8,
      address: 'Rua das Flores, 200',
      totalPrice: 900,
      status: 'concluido',
    },
    {
      id: 'bk-5',
      chefId: 'chef-001',
      chefName: 'Você',
      clientName: 'Ana Beatriz',
      serviceType: 'diaria',
      eventDate: new Date(Date.now() - 16 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      guestsCount: 6,
      address: 'Av. Paulista, 1000',
      totalPrice: 750,
      status: 'concluido',
    },
  ],
};

const MOCK_EARNINGS: ChefEarningsSummary = {
  totalThisMonth: 3200,
  totalLastMonth: 2750,
  completedJobs: 12,
  pendingJobs: 2,
  avgRating: 4.8,
  weeklyData: [
    { label: 'dom', value: 0 },
    { label: 'seg', value: 480 },
    { label: 'ter', value: 0 },
    { label: 'qua', value: 750 },
    { label: 'qui', value: 0 },
    { label: 'sex', value: 900 },
    { label: 'sáb', value: 3200 },
  ],
  monthlyData: [
    { label: 'jan', value: 1800 },
    { label: 'fev', value: 2200 },
    { label: 'mar', value: 1450 },
    { label: 'abr', value: 2750 },
    { label: 'mai', value: 2750 },
    { label: 'jun', value: 3200 },
  ],
  yearlyData: [
    { label: 'jul', value: 1200 },
    { label: 'ago', value: 2100 },
    { label: 'set', value: 1700 },
    { label: 'out', value: 2400 },
    { label: 'nov', value: 2900 },
    { label: 'dez', value: 1800 },
    { label: 'jan', value: 1800 },
    { label: 'fev', value: 2200 },
    { label: 'mar', value: 1450 },
    { label: 'abr', value: 2750 },
    { label: 'mai', value: 2750 },
    { label: 'jun', value: 3200 },
  ],
  recentJobs: [
    { id: 'bk-r1', clientName: 'Marina Costa',   date: new Date(Date.now() - 2  * 86400000).toISOString(), amount: 600 },
    { id: 'bk-r2', clientName: 'João Pereira',    date: new Date(Date.now() - 9  * 86400000).toISOString(), amount: 900 },
    { id: 'bk-r3', clientName: 'Ana Beatriz',     date: new Date(Date.now() - 16 * 86400000).toISOString(), amount: 750 },
    { id: 'bk-r4', clientName: 'Carlos Melo',     date: new Date(Date.now() - 23 * 86400000).toISOString(), amount: 950 },
  ],
};

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

/** Cria um pedido de agendamento (status inicial: solicitado). */
export async function createBooking(params: {
  chefId: string;
  dailyRate: number;
  eventDate: string;      // Data de início 'YYYY-MM-DD'
  eventEndDate?: string;  // Data de fim 'YYYY-MM-DD' (eventos multi-dia)
  totalPrice?: number;    // Preço pré-calculado (dinâmico) — se omitido usa dailyRate
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

  // Bloqueia double-booking: verifica conflito na faixa de datas
  const checkStart = `${params.eventDate}T00:00:00`;
  const checkEnd = `${params.eventEndDate ?? params.eventDate}T23:59:59`;
  const { count } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', params.chefId)
    .gte('event_date', checkStart)
    .lte('event_date', checkEnd)
    .in('status', ['solicitado', 'confirmado', 'em_andamento']);
  if ((count ?? 0) > 0) {
    throw new Error('O chef já tem um agendamento nesta data. Escolha outro período.');
  }

  const numDays = params.eventEndDate ? daysBetween(params.eventDate, params.eventEndDate) : 1;
  const totalPrice = params.totalPrice ?? (params.dailyRate * numDays);

  const { data: newBooking, error } = await supabase.from('bookings').insert({
    client_id: auth.user.id,
    chef_id: params.chefId,
    service_type: params.serviceType,
    event_date: new Date(params.eventDate).toISOString(),
    event_end_date: params.eventEndDate ? new Date(params.eventEndDate).toISOString() : null,
    guests_count: params.guestsCount,
    address: params.address,
    total_price: totalPrice,
    status: 'solicitado',
  }).select('id').single();
  if (error) throw error;

  // Marca o slot de disponibilidade como reservado (se existir)
  await supabase
    .from('chef_availability')
    .update({ is_booked: true })
    .eq('chef_id', params.chefId)
    .eq('date', params.eventDate);

  // Notifica o chef via in-app + push
  try {
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', auth.user.id)
      .single();
    await notifyChefNewBooking(
      params.chefId,
      clientProfile?.full_name ?? 'Cliente',
      params.eventDate,
      newBooking.id,
    );
  } catch {
    // Falha silenciosa — notificação não é bloqueante
  }

  return { mock: false };
}

/** Carrega um agendamento pelo ID com detalhes completos. */
export async function getBookingById(id: string): Promise<BookingDetail | null> {
  if (!isSupabaseConfigured) {
    const all = [...MOCK.asClient, ...MOCK.asChef];
    const found = all.find((b) => b.id === id);
    if (!found) return null;
    return { ...found, clientId: 'mock-user', chefProfileId: 'mock-chef-profile', contractDate: new Date().toISOString() };
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data } = await supabase
    .from('bookings')
    .select(`
      id, client_id, chef_id, service_type, event_date, event_end_date, created_at,
      guests_count, address, notes, total_price, status, payment_status,
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
    contractDate: data.created_at,
    createdAt: data.created_at,
    eventDate: data.event_date,
    eventEndDate: (data as any).event_end_date ?? undefined,
    guestsCount: data.guests_count,
    address: data.address,
    notes: data.notes ?? undefined,
    totalPrice: Number(data.total_price),
    status: data.status,
    paymentStatus: (data as any).payment_status ?? 'pendente',
  };
}

/** Atualiza o status de um agendamento (aceitar/recusar/cancelar). */
export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) throw error;

  // Notifica a outra parte via in-app + push
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        client_id, chef_id, event_date,
        chef_profiles ( profile_id, profiles ( full_name ) ),
        client:profiles!bookings_client_id_fkey ( full_name )
      `)
      .eq('id', id)
      .single();
    if (!booking) return;

    const { data: authData } = await supabase.auth.getUser();
    const myId = authData.user?.id ?? '';
    const isActingAsChef = myId !== (booking as any).client_id;

    if (isActingAsChef && (status === 'confirmado' || status === 'cancelado' || status === 'concluido')) {
      // Chef agindo → notifica cliente
      const chefName = (booking as any).chef_profiles?.profiles?.full_name ?? 'Chef';
      await notifyClientStatusChange(
        (booking as any).client_id,
        chefName,
        status as 'confirmado' | 'cancelado' | 'concluido',
        (booking as any).event_date,
        id,
      );
    } else if (!isActingAsChef && status === 'cancelado') {
      // Cliente cancelando → notifica chef
      const clientName = (booking as any).client?.full_name ?? 'Cliente';
      await notifyChefBookingCancelled(
        (booking as any).chef_id,
        clientName,
        (booking as any).event_date,
        id,
      );
    }
  } catch {
    // Falha silenciosa — não impede a atualização
  }
}

/** Carrega os agendamentos do usuário, separados por papel. */
export async function getMyBookings(): Promise<MyBookings> {
  if (!isSupabaseConfigured) {
    await delay();
    return MOCK;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { asClient: [], asChef: [] };

  // Como cliente: agendamentos que eu contratei (nome e avatar do chef vem do perfil).
  const { data: clientRows } = await supabase
    .from('bookings')
    .select(
      'id, chef_id, service_type, event_date, created_at, guests_count, address, total_price, status, payment_status, chef_profiles ( profiles ( full_name, avatar_url ) )',
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
        'id, chef_id, service_type, event_date, created_at, guests_count, address, total_price, status, payment_status, client:profiles!bookings_client_id_fkey ( full_name, avatar_url )',
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
    createdAt: r.created_at,
    guestsCount: r.guests_count,
    address: r.address,
    totalPrice: Number(r.total_price),
    status: r.status,
    paymentStatus: r.payment_status ?? 'pendente',
    counterpartAvatarUrl: r.chef_profiles?.profiles?.avatar_url ?? undefined,
  });

  const mapChef = (r: any): BookingListItem => ({
    id: r.id,
    chefId: r.chef_id,
    chefName: 'Você',
    clientName: r.client?.full_name ?? 'Cliente',
    serviceType: r.service_type,
    eventDate: r.event_date,
    createdAt: r.created_at,
    guestsCount: r.guests_count,
    address: r.address,
    totalPrice: Number(r.total_price),
    status: r.status,
    paymentStatus: r.payment_status ?? 'pendente',
    counterpartAvatarUrl: r.client?.avatar_url ?? undefined,
  });

  return {
    asClient: (clientRows ?? []).map(mapClient),
    asChef: chefRows.map(mapChef),
  };
}

/** Resumo financeiro do chef: ganhos, histórico mensal e trabalhos recentes. */
export async function getChefEarnings(): Promise<ChefEarningsSummary | null> {
  if (!isSupabaseConfigured) {
    await delay();
    return MOCK_EARNINGS;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: myChef } = await supabase
    .from('chef_profiles')
    .select('id, rating_avg')
    .eq('profile_id', auth.user.id)
    .maybeSingle();

  if (!myChef) return null;

  const { data: allJobs } = await supabase
    .from('bookings')
    .select('id, total_price, status, event_date, client:profiles!bookings_client_id_fkey ( full_name, avatar_url )')
    .eq('chef_id', myChef.id)
    .order('event_date', { ascending: false });

  if (!allJobs) return null;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const completed = allJobs.filter((j) => j.status === 'concluido');
  const pending   = allJobs.filter((j) => ['solicitado', 'confirmado', 'em_andamento'].includes(j.status));

  const totalThisMonth = completed
    .filter((j) => { const d = new Date(j.event_date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
    .reduce((sum, j) => sum + Number(j.total_price), 0);

  const totalLastMonth = completed
    .filter((j) => { const d = new Date(j.event_date); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear; })
    .reduce((sum, j) => sum + Number(j.total_price), 0);

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().substring(0, 10);
    const value = completed
      .filter((j) => j.event_date.substring(0, 10) === dateStr)
      .reduce((sum, j) => sum + Number(j.total_price), 0);
    return { label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), value };
  });

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (5 - i));
    const m = d.getMonth();
    const y = d.getFullYear();
    const value = completed
      .filter((j) => { const jd = new Date(j.event_date); return jd.getMonth() === m && jd.getFullYear() === y; })
      .reduce((sum, j) => sum + Number(j.total_price), 0);
    return { label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), value };
  });

  const yearlyData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (11 - i));
    const m = d.getMonth();
    const y = d.getFullYear();
    const value = completed
      .filter((j) => { const jd = new Date(j.event_date); return jd.getMonth() === m && jd.getFullYear() === y; })
      .reduce((sum, j) => sum + Number(j.total_price), 0);
    return { label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), value };
  });

  const recentJobs = completed.slice(0, 5).map((j) => ({
    id: j.id,
    clientName: (j.client as any)?.full_name ?? 'Cliente',
    date: j.event_date,
    amount: Number(j.total_price),
    avatarUrl: (j.client as any)?.avatar_url ?? undefined,
  }));

  return {
    totalThisMonth,
    totalLastMonth,
    completedJobs: completed.length,
    pendingJobs: pending.length,
    avgRating: myChef.rating_avg ?? 0,
    weeklyData,
    monthlyData,
    yearlyData,
    recentJobs,
  };
}
