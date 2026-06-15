-- ============================================================================
--  SeuChefe Gourmet — Fase 7: Verificação de identidade dos chefs
--  Execute no SQL Editor do Supabase APÓS fase-6-migration.sql
-- ============================================================================

-- Tabela de solicitações de verificação
CREATE TABLE IF NOT EXISTS "chef_verifications" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "chef_id"      uuid NOT NULL REFERENCES "chef_profiles"("id") ON DELETE CASCADE,
  "rg_url"       text NOT NULL,
  "cpf_url"      text,
  "selfie_url"   text NOT NULL,
  "status"       "verification_status" NOT NULL DEFAULT 'pendente',
  "notes"        text,
  "submitted_at" timestamptz NOT NULL DEFAULT now(),
  "reviewed_at"  timestamptz,
  -- Um chef pode ter somente uma solicitação ativa por vez
  UNIQUE ("chef_id")
);

-- RLS
ALTER TABLE "chef_verifications" ENABLE ROW LEVEL SECURITY;

-- Chef só vê e gerencia o próprio registro
CREATE POLICY "verif_read_owner" ON "chef_verifications"
  FOR SELECT USING (public.is_chef_owner("chef_id"));

CREATE POLICY "verif_insert_owner" ON "chef_verifications"
  FOR INSERT WITH CHECK (public.is_chef_owner("chef_id"));

-- Bucket privado para documentos sensíveis
-- Execute isto no Storage do Supabase ou pelo painel:
--   INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', false);

-- Políticas de storage para o bucket verification-docs
-- (ajuste se criar o bucket pelo painel)
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "verif_docs_insert_owner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "verif_docs_select_owner"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
