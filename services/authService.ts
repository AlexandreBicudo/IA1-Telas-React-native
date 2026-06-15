/**
 * Autenticação por e-mail e senha (Supabase Auth).
 *
 * Em modo mock (sem credenciais no .env), as funções simulam sucesso para que
 * o fluxo de telas continue navegável durante a apresentação offline.
 */
import * as Linking from 'expo-linking';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/database';

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export interface SignInParams {
  email: string;
  password: string;
}

/**
 * Cria a conta. O gatilho handle_new_user (policies.sql) cria o profile a
 * partir dos metadados; para chefs, também criamos o chef_profile inicial.
 */
export async function signUp({ email, password, fullName, role }: SignUpParams) {
  if (!isSupabaseConfigured) return { mock: true } as const;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
      // Link de confirmação abre o app na tela /confirmado (deep link).
      emailRedirectTo: Linking.createURL('/confirmado'),
    },
  });
  if (error) throw error;

  // Se o cadastro já gerou sessão (confirmação de e-mail desativada) e é chef,
  // cria o perfil profissional inicial com status de validação pendente.
  if (role === 'chef' && data.user) {
    await supabase
      .from('chef_profiles')
      .insert({ profile_id: data.user.id })
      .select()
      .maybeSingle();
  }

  return { mock: false, user: data.user, session: data.session } as const;
}

export async function signIn({ email, password }: SignInParams) {
  if (!isSupabaseConfigured) return { mock: true } as const;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { mock: false, user: data.user, session: data.session } as const;
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Sessão atual (null se deslogado ou em modo mock). */
export async function getCurrentSession() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Altera o e-mail do usuário logado.
 * Requer a senha atual para verificar a identidade antes da mudança.
 */
export async function updateEmail(newEmail: string, currentPassword: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) throw new Error('Sessão expirada. Faça login novamente.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) throw new Error('Formato de e-mail inválido.');
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: currentPassword,
  });
  if (signInError) throw new Error('Senha atual incorreta.');
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
}

/**
 * Altera a senha do usuário logado.
 * Requer a senha atual antes de aceitar a nova.
 */
export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (newPassword.length < 6) throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) throw new Error('Sessão expirada. Faça login novamente.');
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: currentPassword,
  });
  if (signInError) throw new Error('Senha atual incorreta.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Traduz os erros mais comuns do Supabase Auth para mensagens em português. */
export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/Invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/User already registered/i.test(message)) return 'Este e-mail já está cadastrado.';
  if (/Password should be at least/i.test(message))
    return 'A senha deve ter pelo menos 6 caracteres.';
  if (/Email not confirmed/i.test(message))
    return 'Confirme seu e-mail antes de entrar.';
  return message || 'Ocorreu um erro. Tente novamente.';
}
