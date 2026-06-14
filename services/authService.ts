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
