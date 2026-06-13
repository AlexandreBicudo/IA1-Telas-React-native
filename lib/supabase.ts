/**
 * Cliente Supabase — ponto único de comunicação do app com o backend.
 *
 * ⚠️ INTEGRAÇÃO PENDENTE (Fase 3). Hoje a camada `services/` usa mocks, então
 * este arquivo ainda não é importado por nenhuma tela. Para ativá-lo:
 *
 *   1. npm install @supabase/supabase-js
 *   2. Defina as variáveis em app.json > expo.extra (ou .env via app.config.ts):
 *        EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY
 *   3. Rode o schema em supabase/schema.sql no SQL Editor do projeto Supabase.
 *   4. Troque as implementações mock em services/ pelas chamadas reais
 *      (já documentadas em comentário ao lado de cada função).
 *
 * O anon key é público por design (protegido por Row Level Security no banco).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Em React Native, persistir a sessão exige um storage assíncrono
    // (ex.: @react-native-async-storage/async-storage). Configurar na Fase 3.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
