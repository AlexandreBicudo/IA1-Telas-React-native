/**
 * Avaliações (reviews) — cliente avalia chef e vice-versa após serviço concluído.
 * Rating atualiza rating_avg e rating_count no chef_profiles automaticamente.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  reviewerName: string;
  createdAt: string;
  chefResponse?: string;
  chefResponseAt?: string;
}

/** Verifica se o usuário logado já avaliou este agendamento. */
export async function hasReviewed(bookingId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { count } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('booking_id', bookingId)
    .eq('reviewer_id', auth.user.id);
  return (count ?? 0) > 0;
}

/**
 * Cria uma avaliação.
 * Se o reviewee for o chef (chefId preenchido), atualiza o rating médio.
 */
export async function createReview(params: {
  bookingId: string;
  revieweeId: string;  // profiles.id de quem recebe a avaliação
  chefId?: string;     // chef_profiles.id — preenchido quando avaliando o chef
  rating: number;
  comment?: string;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sessão expirada.');

  const { error } = await supabase.from('reviews').insert({
    booking_id: params.bookingId,
    reviewer_id: auth.user.id,
    reviewee_id: params.revieweeId,
    rating: params.rating,
    comment: params.comment?.trim() || null,
  });
  if (error) throw error;
  // rating_avg e rating_count são atualizados automaticamente pelo trigger
  // fn_refresh_chef_rating (fase-6-migration.sql) com SECURITY DEFINER.
}

/** Lista avaliações públicas de um chef (para o perfil público). */
export async function getChefReviews(chefId: string): Promise<Review[]> {
  if (!isSupabaseConfigured) return [
    { id: 'rv-1', rating: 5, comment: 'Excelente profissional, superou expectativas!', reviewerName: 'Ana Lima', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), chefResponse: 'Muito obrigado, Ana! Foi um prazer atender você.' },
    { id: 'rv-2', rating: 4, comment: 'Ótima experiência, pontual e muito caprichoso.', reviewerName: 'Pedro Ramos', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  ];

  const { data } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment, created_at, chef_response, chef_response_at,
      reviewer:profiles!reviews_reviewer_id_fkey ( full_name ),
      booking:bookings!reviews_booking_id_fkey!inner ( chef_id )
    `)
    .eq('booking.chef_id', chefId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? undefined,
    reviewerName: r.reviewer?.full_name ?? 'Cliente',
    createdAt: r.created_at,
    chefResponse: r.chef_response ?? undefined,
    chefResponseAt: r.chef_response_at ?? undefined,
  }));
}

/** Chef responde a uma avaliação recebida. */
export async function respondToReview(reviewId: string, response: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('reviews')
    .update({ chef_response: response.trim(), chef_response_at: new Date().toISOString() })
    .eq('id', reviewId);
  if (error) throw error;
}

/** Lista avaliações que o chef logado recebeu (para a Carteira). */
export async function getMyReceivedReviews(): Promise<Review[]> {
  if (!isSupabaseConfigured) return [
    { id: 'rv-1', rating: 5, comment: 'Excelente profissional, superou expectativas!', reviewerName: 'Ana Lima', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), chefResponse: 'Muito obrigado, Ana! Foi um prazer atender você.' },
    { id: 'rv-2', rating: 4, comment: 'Ótima experiência, pontual e muito caprichoso.', reviewerName: 'Pedro Ramos', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: 'rv-3', rating: 5, comment: 'Simplesmente incrível. Recomendo demais!', reviewerName: 'Carla Souza', createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
  ];

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data: myChef } = await supabase
    .from('chef_profiles').select('id').eq('profile_id', auth.user.id).maybeSingle();
  if (!myChef) return [];

  const { data } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment, created_at, chef_response, chef_response_at,
      reviewer:profiles!reviews_reviewer_id_fkey ( full_name ),
      booking:bookings!reviews_booking_id_fkey!inner ( chef_id )
    `)
    .eq('booking.chef_id', myChef.id)
    .order('created_at', { ascending: false });

  return (data ?? []).map((r: any) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? undefined,
    reviewerName: r.reviewer?.full_name ?? 'Cliente',
    createdAt: r.created_at,
    chefResponse: r.chef_response ?? undefined,
    chefResponseAt: r.chef_response_at ?? undefined,
  }));
}
