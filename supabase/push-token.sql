-- Rodar no SQL Editor do Supabase.
-- Adiciona coluna push_token para notificações push (Expo Push API).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
