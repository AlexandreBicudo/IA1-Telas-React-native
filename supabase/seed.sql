-- ============================================================================
--  SeuChefe Gourmet — Dados iniciais (seed)
--
--  Execute por último, no SQL Editor do Supabase.
--  Popula apenas o domínio de especialidades — os perfis de chefs surgem de
--  cadastros reais (profiles depende de auth.users, criado no signUp).
-- ============================================================================

INSERT INTO "specialties" ("name") VALUES
  ('Francesa'),
  ('Italiana'),
  ('Japonesa'),
  ('Contemporânea'),
  ('Confeitaria'),
  ('Mediterrânea'),
  ('Brasileira'),
  ('Vegana'),
  ('Carnes'),
  ('Frutos do Mar')
ON CONFLICT ("name") DO NOTHING;
