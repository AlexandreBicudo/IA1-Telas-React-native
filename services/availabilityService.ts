/**
 * Disponibilidade do chef (tabela chef_availability).
 *
 * O chef cadastra os dias em que está livre; o cliente só consegue agendar
 * nesses dias. Em modo mock devolve dias de exemplo.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface AvailabilitySlot {
  id: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

const DEFAULT_START = '10:00';
const DEFAULT_END = '22:00';

const today = () => new Date().toISOString().slice(0, 10);

/** Gera N datas futuras (mock): pula de 2 em 2 dias a partir de amanhã. */
function mockDates(n: number): string[] {
  const out: string[] = [];
  for (let i = 1; i <= n * 2; i += 2) {
    out.push(new Date(Date.now() + i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

async function myChefId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('profile_id', auth.user.id)
    .maybeSingle();
  return data?.id ?? null;
}

/** Disponibilidade do chef logado (datas futuras). */
export async function getMyAvailability(): Promise<AvailabilitySlot[]> {
  if (!isSupabaseConfigured) {
    return mockDates(4).map((date, i) => ({
      id: `mock-${i}`,
      date,
      startTime: DEFAULT_START,
      endTime: DEFAULT_END,
      isBooked: false,
    }));
  }
  const chefId = await myChefId();
  if (!chefId) return [];
  const { data } = await supabase
    .from('chef_availability')
    .select('id, date, start_time, end_time, is_booked')
    .eq('chef_id', chefId)
    .gte('date', today())
    .order('date', { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    isBooked: r.is_booked,
  }));
}

/** Adiciona um dia disponível (ignora se já existe). */
export async function addAvailabilityDate(date: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const chefId = await myChefId();
  if (!chefId) throw new Error('Sessão expirada.');

  const { data: existing } = await supabase
    .from('chef_availability')
    .select('id')
    .eq('chef_id', chefId)
    .eq('date', date)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase.from('chef_availability').insert({
    chef_id: chefId,
    date,
    start_time: DEFAULT_START,
    end_time: DEFAULT_END,
    is_booked: false,
  });
  if (error) throw error;
}

/** Remove um dia disponível. */
export async function removeAvailability(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('chef_availability').delete().eq('id', id);
  if (error) throw error;
}

/** Datas livres (não reservadas) de um chef, para o calendário do cliente. */
export async function getChefAvailableDates(chefId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return mockDates(5);
  const { data } = await supabase
    .from('chef_availability')
    .select('date')
    .eq('chef_id', chefId)
    .eq('is_booked', false)
    .gte('date', today())
    .order('date', { ascending: true });
  return Array.from(new Set((data ?? []).map((r) => r.date)));
}

/** Marca o slot do dia como reservado (chamado ao confirmar o agendamento). */
export async function markDateBooked(chefId: string, date: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase
    .from('chef_availability')
    .update({ is_booked: true })
    .eq('chef_id', chefId)
    .eq('date', date);
}
