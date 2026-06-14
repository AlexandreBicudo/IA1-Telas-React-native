/**
 * Cliente Supabase — ponto único de comunicação do app com o backend.
 *
 * Lê as credenciais de variáveis EXPO_PUBLIC_* (ver .env / .env.example).
 * Se elas não estiverem definidas, `isSupabaseConfigured` fica falso e a
 * camada services/ usa os mocks automaticamente (modo de apresentação offline).
 *
 * A sessão é persistida no dispositivo via AsyncStorage, então o usuário
 * continua logado entre aberturas do app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True quando há URL + chave configuradas; caso contrário, o app roda em modo mock. */
export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Em React Native não há URL de redirecionamento para detectar sessão.
    detectSessionInUrl: false,
  },
});
