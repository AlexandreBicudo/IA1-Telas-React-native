/**
 * Conta e perfis do usuário logado.
 *
 * Modelo "conta única, dois modos": qualquer usuário pode contratar chefs
 * (navegar no catálogo) e também ativar um perfil profissional para oferecer
 * serviços — tudo na mesma conta. Em modo mock, devolve dados de exemplo.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { MOCK_CURRENT_CHEF_ID } from '@/mocks/chefs';
import type { UserRole } from '@/types/database';

export interface MyAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  hasChefProfile: boolean;
  chefId: string | null;
}

export interface ChefProfileEdit {
  headline: string;
  bio: string;
  dailyRate: number;
  yearsExperience: number;
  isAvailable: boolean;
  specialties: string[];
}

/** Dados da conta logada (ou mock em modo offline). */
export async function getMyAccount(): Promise<MyAccount | null> {
  if (!isSupabaseConfigured) {
    return {
      id: 'mock-user',
      name: 'Você (demonstração)',
      email: 'demo@seuchefe.app',
      role: 'chef',
      avatarUrl: null,
      city: 'São Paulo',
      state: 'SP',
      hasChefProfile: true,
      chefId: MOCK_CURRENT_CHEF_ID,
    };
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url, city, state')
    .eq('id', auth.user.id)
    .maybeSingle();

  const { data: chef } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('profile_id', auth.user.id)
    .maybeSingle();

  return {
    id: auth.user.id,
    name: profile?.full_name ?? '',
    email: auth.user.email ?? '',
    role: (profile?.role as UserRole) ?? 'cliente',
    avatarUrl: profile?.avatar_url ?? null,
    city: profile?.city ?? null,
    state: profile?.state ?? null,
    hasChefProfile: Boolean(chef),
    chefId: chef?.id ?? null,
  };
}

/** Ativa (ou recupera) o perfil profissional do usuário logado. Retorna o chefId. */
export async function activateChefProfile(): Promise<string> {
  if (!isSupabaseConfigured) return MOCK_CURRENT_CHEF_ID;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada. Faça login novamente.');

  // Já existe?
  const { data: existing } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('profile_id', auth.user.id)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('chef_profiles')
    .insert({ profile_id: auth.user.id })
    .select('id')
    .single();
  if (error) throw error;

  // Passa a contar como chef (mantém podendo contratar também).
  await supabase.from('profiles').update({ role: 'chef' }).eq('id', auth.user.id);
  return data.id;
}

/** Salva as edições do perfil profissional + substitui as especialidades. */
export async function updateChefProfile(chefId: string, edit: ChefProfileEdit): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('chef_profiles')
    .update({
      headline: edit.headline,
      bio: edit.bio,
      daily_rate: edit.dailyRate,
      years_experience: edit.yearsExperience,
      is_available: edit.isAvailable,
    })
    .eq('id', chefId);
  if (error) throw error;

  // Substitui o conjunto de especialidades
  await supabase.from('chef_specialties').delete().eq('chef_id', chefId);
  if (edit.specialties.length > 0) {
    const { data: specs } = await supabase
      .from('specialties')
      .select('id, name')
      .in('name', edit.specialties);
    const rows = (specs ?? []).map((s) => ({ chef_id: chefId, specialty_id: s.id }));
    if (rows.length > 0) {
      await supabase.from('chef_specialties').insert(rows);
    }
  }
}

/** Salva a URL do avatar no perfil do usuário logado. */
export async function updateAvatarUrl(url: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada.');
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', auth.user.id);
  if (error) throw error;
}

/** Atualiza dados básicos da conta (nome, cidade, UF). */
export async function updateMyProfile(fields: {
  fullName?: string;
  city?: string;
  state?: string;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada.');

  const patch: Record<string, string> = {};
  if (fields.fullName != null) patch.full_name = fields.fullName;
  if (fields.city != null) patch.city = fields.city;
  if (fields.state != null) patch.state = fields.state;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from('profiles').update(patch).eq('id', auth.user.id);
  if (error) throw error;
}
