/**
 * Camada de serviço para profissionais (chefs).
 *
 * Hoje resolve tudo a partir dos mocks (mocks/chefs.ts). Cada função traz, em
 * comentário, a query Supabase equivalente — basta descomentar e remover o
 * mock quando o banco estiver conectado (ver lib/supabase.ts).
 */
import { MOCK_CHEFS, MOCK_CURRENT_CHEF_ID } from '@/mocks/chefs';
import type { ChefListing, ChefSearchFilters } from '@/types/database';

/** Simula latência de rede para o app já lidar com estados de carregamento. */
const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Busca e filtragem avançada de chefs (RF: Sistema de Busca e Filtragem).
 * Filtra por texto, especialidade, avaliação mínima, faixa de preço e disponibilidade.
 */
export async function searchChefs(filters: ChefSearchFilters = {}): Promise<ChefListing[]> {
  await delay();

  const { query, specialty, minRating, maxDailyRate, onlyAvailable } = filters;
  const term = query?.trim().toLowerCase();

  return MOCK_CHEFS.filter((chef) => {
    if (term) {
      const haystack = `${chef.name} ${chef.headline ?? ''}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    if (specialty && !chef.specialties.includes(specialty)) return false;
    if (minRating != null && chef.ratingAvg < minRating) return false;
    if (maxDailyRate != null && chef.dailyRate > maxDailyRate) return false;
    if (onlyAvailable && !chef.isAvailable) return false;
    return true;
  }).sort((a, b) => b.ratingAvg - a.ratingAvg);

  // Equivalente Supabase (Fase 3):
  // let q = supabase.from('chef_profiles')
  //   .select('*, profiles(full_name, city, state, avatar_url), chef_specialties(specialties(name))');
  // if (onlyAvailable) q = q.eq('is_available', true);
  // if (minRating != null) q = q.gte('rating_avg', minRating);
  // if (maxDailyRate != null) q = q.lte('daily_rate', maxDailyRate);
  // const { data, error } = await q;
}

/** Carrega o perfil completo de um chef pelo id (tela de Perfil do Profissional). */
export async function getChefById(id: string): Promise<ChefListing | null> {
  await delay();
  return MOCK_CHEFS.find((chef) => chef.id === id) ?? null;

  // Equivalente Supabase (Fase 3):
  // const { data } = await supabase.from('chef_profiles')
  //   .select('*, profiles(*), chef_specialties(specialties(name)), portfolio_items(*), work_experiences(*)')
  //   .eq('id', id).single();
}

/** Retorna o perfil do profissional atualmente logado (mock: chef fixo). */
export async function getMyChefProfile(): Promise<ChefListing | null> {
  return getChefById(MOCK_CURRENT_CHEF_ID);

  // Equivalente Supabase (Fase 3): usar supabase.auth.getUser() para obter o id
  // e filtrar chef_profiles.profile_id pelo usuário autenticado.
}

/** Lista as especialidades disponíveis para os filtros do catálogo. */
export { SPECIALTIES } from '@/constants/specialties';
