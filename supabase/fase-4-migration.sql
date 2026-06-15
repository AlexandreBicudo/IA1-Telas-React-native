-- Fase 4: Separação conta/perfil profissional + respostas a avaliações

-- Nome artístico / vulgo do chef (exibido publicamente no catálogo)
ALTER TABLE chef_profiles ADD COLUMN IF NOT EXISTS display_name text;

-- Foto profissional separada da foto de conta
ALTER TABLE chef_profiles ADD COLUMN IF NOT EXISTS professional_avatar_url text;

-- Resposta do chef à avaliação
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS chef_response text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS chef_response_at timestamptz;
