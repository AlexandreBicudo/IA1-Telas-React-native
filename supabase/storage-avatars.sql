-- Rodar no SQL Editor do Supabase (dashboard > SQL Editor > New query)
-- Cria o bucket "avatars" e as políticas de acesso.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública (qualquer um pode ver o avatar)
CREATE POLICY "Avatares são públicos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Upload: apenas o próprio usuário, na pasta {uid}/
CREATE POLICY "Usuário faz upload do próprio avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Atualização (upsert)
CREATE POLICY "Usuário atualiza o próprio avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Remoção
CREATE POLICY "Usuário remove o próprio avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
