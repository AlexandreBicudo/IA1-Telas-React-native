/**
 * Camada de serviço para profissionais (chefs).
 *
 * Quando o Supabase está configurado (.env preenchido), busca do banco real;
 * caso contrário, cai para os mocks (mocks/chefs.ts). Os filtros são aplicados
 * em JS sobre o resultado, garantindo o mesmo comportamento nos dois modos.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { MOCK_CHEFS, MOCK_CURRENT_CHEF_ID } from '@/mocks/chefs';
import type { ChefListing, ChefSearchFilters } from '@/types/database';

/** Linha do Supabase com as relações aninhadas usadas para montar o ChefListing. */
interface ChefRow {
  id: string;
  profile_id: string;
  headline: string | null;
  bio: string | null;
  years_experience: number;
  daily_rate: number;
  rating_avg: number;
  rating_count: number;
  verification_status: ChefListing['verificationStatus'];
  is_available: boolean;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    city: string | null;
    state: string | null;
  } | null;
  chef_specialties: { specialties: { name: string } | null }[];
  work_experiences?: ChefListing['experiences'];
  portfolio_items?: ChefListing['portfolio'];
}

const CHEF_SELECT = `
  id, profile_id, headline, bio, years_experience, daily_rate,
  rating_avg, rating_count, verification_status, is_available,
  profiles ( full_name, avatar_url, city, state ),
  chef_specialties ( specialties ( name ) ),
  work_experiences ( id, chef_id, restaurant_name, role, start_date, end_date ),
  portfolio_items ( id, chef_id, image_url, title, description )
`;

function mapRow(row: ChefRow): ChefListing {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.profiles?.full_name ?? 'Chef',
    avatarUrl: row.profiles?.avatar_url ?? null,
    city: row.profiles?.city ?? null,
    state: row.profiles?.state ?? null,
    headline: row.headline,
    bio: row.bio,
    yearsExperience: row.years_experience,
    dailyRate: Number(row.daily_rate),
    ratingAvg: Number(row.rating_avg),
    ratingCount: row.rating_count,
    verificationStatus: row.verification_status,
    isAvailable: row.is_available,
    specialties: (row.chef_specialties ?? [])
      .map((cs) => cs.specialties?.name)
      .filter((n): n is string => Boolean(n)),
    experiences: row.work_experiences ?? [],
    portfolio: row.portfolio_items ?? [],
  };
}

/** Aplica os filtros da busca avançada (mesma lógica para banco e mock). */
function applyFilters(chefs: ChefListing[], filters: ChefSearchFilters): ChefListing[] {
  const { query, specialty, minRating, maxDailyRate, onlyAvailable } = filters;
  const term = query?.trim().toLowerCase();

  return chefs
    .filter((chef) => {
      if (term) {
        const haystack = `${chef.name} ${chef.headline ?? ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (specialty && !chef.specialties.includes(specialty)) return false;
      if (minRating != null && chef.ratingAvg < minRating) return false;
      if (maxDailyRate != null && chef.dailyRate > maxDailyRate) return false;
      if (onlyAvailable && !chef.isAvailable) return false;
      return true;
    })
    .sort((a, b) => b.ratingAvg - a.ratingAvg);
}

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/** Busca e filtragem avançada de chefs (RF: Sistema de Busca e Filtragem). */
export async function searchChefs(filters: ChefSearchFilters = {}): Promise<ChefListing[]> {
  if (!isSupabaseConfigured) {
    await delay();
    return applyFilters(MOCK_CHEFS, filters);
  }

  const { data, error } = await supabase.from('chef_profiles').select(CHEF_SELECT);
  if (error) {
    console.warn('[chefService] erro ao buscar chefs, usando mock:', error.message);
    return applyFilters(MOCK_CHEFS, filters);
  }
  return applyFilters((data as unknown as ChefRow[]).map(mapRow), filters);
}

/** Carrega o perfil completo de um chef pelo id. */
export async function getChefById(id: string): Promise<ChefListing | null> {
  if (!isSupabaseConfigured) {
    await delay();
    return MOCK_CHEFS.find((chef) => chef.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from('chef_profiles')
    .select(CHEF_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error || !data) {
    if (error) console.warn('[chefService] erro ao buscar chef, usando mock:', error.message);
    return MOCK_CHEFS.find((chef) => chef.id === id) ?? null;
  }
  return mapRow(data as unknown as ChefRow);
}

/** Retorna o perfil do profissional logado (ou o mock, em modo offline). */
export async function getMyChefProfile(): Promise<ChefListing | null> {
  if (!isSupabaseConfigured) {
    return getChefById(MOCK_CURRENT_CHEF_ID);
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from('chef_profiles')
    .select(CHEF_SELECT)
    .eq('profile_id', auth.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as unknown as ChefRow);
}

/** Lista as especialidades disponíveis para os filtros do catálogo. */
export { SPECIALTIES } from '@/constants/specialties';
