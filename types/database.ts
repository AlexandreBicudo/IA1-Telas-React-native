/**
 * Tipos TypeScript que espelham o schema PostgreSQL (supabase/schema.sql).
 *
 * Servem tanto para os mocks atuais quanto para a futura integração com o
 * Supabase: ao gerar os tipos via `supabase gen types`, estes contratos
 * permanecem compatíveis com a camada `services/`.
 */

export type UserRole = 'cliente' | 'chef';

/** Faixa de dias com preço por dia (precificação dinâmica do chef). */
export interface PricingTier {
  minDays: number;
  maxDays: number | null; // null = sem limite superior (ex: "6+ dias")
  ratePerDay: number;
}
export type VerificationStatus = 'pendente' | 'aprovado' | 'rejeitado';
export type ServiceType = 'diaria' | 'evento';
export type BookingStatus =
  | 'solicitado'
  | 'confirmado'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado';
export type PaymentMethod = 'pix' | 'cartao';
export type PaymentStatus = 'pendente' | 'pago' | 'estornado';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  state?: string | null;
  created_at: string;
}

export interface Specialty {
  id: string;
  name: string;
}

export interface WorkExperience {
  id: string;
  chef_id: string;
  restaurant_name: string;
  role: string;
  start_date: string;
  end_date?: string | null;
}

export interface PortfolioItem {
  id: string;
  chef_id: string;
  image_url: string;
  title: string;
  description?: string | null;
}

export interface ChefProfile {
  id: string;
  profile_id: string;
  headline?: string | null;
  bio?: string | null;
  years_experience: number;
  daily_rate: number;
  rating_avg: number;
  rating_count: number;
  verification_status: VerificationStatus;
  is_available: boolean;
  pricing_tiers?: PricingTier[] | null;
  display_name?: string | null;          // nome artístico/vulgo opcional
  professional_avatar_url?: string | null; // foto profissional separada
}

/** Forma achatada usada pelo Catálogo e pela tela de Perfil (chef + profile + agregados). */
export interface ChefListing {
  id: string; // chef_profiles.id
  profileId: string;
  name: string;                          // display_name ?? full_name
  accountName: string;                   // full_name (nome da conta)
  avatarUrl?: string | null;             // foto profissional (professional_avatar_url ?? avatar pessoal)
  personalAvatarUrl?: string | null;     // foto pessoal da conta
  city?: string | null;
  state?: string | null;
  headline?: string | null;
  bio?: string | null;
  yearsExperience: number;
  dailyRate: number;
  ratingAvg: number;
  ratingCount: number;
  verificationStatus: VerificationStatus;
  isAvailable: boolean;
  pricingTiers?: PricingTier[] | null;
  specialties: string[];
  experiences?: WorkExperience[];
  portfolio?: PortfolioItem[];
}

/** Critérios da busca avançada do Catálogo. */
export interface ChefSearchFilters {
  query?: string; // nome ou headline
  specialty?: string | null; // tipo de culinária
  minRating?: number | null; // avaliação mínima (0-5)
  maxDailyRate?: number | null; // faixa de preço máxima
  onlyAvailable?: boolean; // apenas disponíveis
  onlyVerified?: boolean; // apenas chefs com identidade verificada
}
