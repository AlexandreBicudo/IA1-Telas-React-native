-- ============================================================================
--  SeuChefe Gourmet — Row Level Security (RLS) + gatilho de criação de perfil
--
--  Execute DEPOIS de supabase/schema.sql, no SQL Editor do Supabase.
--  Garante que cada usuário só acesse o que lhe pertence, enquanto mantém o
--  catálogo de chefs publicamente visível (necessário para a busca).
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Gatilho: ao criar um usuário no Auth, cria automaticamente o profile.
--  O app envia full_name e role em options.data no signUp (ver authService).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles ("id", "role", "full_name")
  VALUES (
    NEW."id",
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'cliente'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
--  Habilita RLS em todas as tabelas
-- ----------------------------------------------------------------------------
ALTER TABLE "profiles"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chef_profiles"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "specialties"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chef_specialties"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_experiences"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolio_items"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chef_availability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments"          ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
--  Conteúdo público do catálogo (leitura liberada para a busca/filtragem)
-- ----------------------------------------------------------------------------
CREATE POLICY "profiles_read_all"      ON "profiles"         FOR SELECT USING (true);
CREATE POLICY "chef_read_all"          ON "chef_profiles"    FOR SELECT USING (true);
CREATE POLICY "specialties_read_all"   ON "specialties"      FOR SELECT USING (true);
CREATE POLICY "chefspec_read_all"      ON "chef_specialties" FOR SELECT USING (true);
CREATE POLICY "work_read_all"          ON "work_experiences" FOR SELECT USING (true);
CREATE POLICY "portfolio_read_all"     ON "portfolio_items"  FOR SELECT USING (true);
CREATE POLICY "availability_read_all"  ON "chef_availability" FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
--  profiles — cada usuário gerencia o próprio registro
-- ----------------------------------------------------------------------------
CREATE POLICY "profiles_insert_self" ON "profiles"
  FOR INSERT WITH CHECK (auth.uid() = "id");
CREATE POLICY "profiles_update_self" ON "profiles"
  FOR UPDATE USING (auth.uid() = "id");

-- ----------------------------------------------------------------------------
--  Função auxiliar: o profile_id do chef pertence ao usuário logado?
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_chef_owner(p_chef_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chef_profiles
    WHERE "id" = p_chef_id AND "profile_id" = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
--  Dados que o próprio chef gerencia (escrita restrita ao dono)
-- ----------------------------------------------------------------------------
CREATE POLICY "chef_write_owner" ON "chef_profiles"
  FOR ALL USING (auth.uid() = "profile_id") WITH CHECK (auth.uid() = "profile_id");

CREATE POLICY "chefspec_write_owner" ON "chef_specialties"
  FOR ALL USING (public.is_chef_owner("chef_id")) WITH CHECK (public.is_chef_owner("chef_id"));

CREATE POLICY "work_write_owner" ON "work_experiences"
  FOR ALL USING (public.is_chef_owner("chef_id")) WITH CHECK (public.is_chef_owner("chef_id"));

CREATE POLICY "portfolio_write_owner" ON "portfolio_items"
  FOR ALL USING (public.is_chef_owner("chef_id")) WITH CHECK (public.is_chef_owner("chef_id"));

CREATE POLICY "availability_write_owner" ON "chef_availability"
  FOR ALL USING (public.is_chef_owner("chef_id")) WITH CHECK (public.is_chef_owner("chef_id"));

-- ----------------------------------------------------------------------------
--  bookings — visíveis e gerenciáveis pelas duas partes (cliente e chef)
-- ----------------------------------------------------------------------------
CREATE POLICY "bookings_read_parties" ON "bookings"
  FOR SELECT USING (auth.uid() = "client_id" OR public.is_chef_owner("chef_id"));
CREATE POLICY "bookings_insert_client" ON "bookings"
  FOR INSERT WITH CHECK (auth.uid() = "client_id");
CREATE POLICY "bookings_update_parties" ON "bookings"
  FOR UPDATE USING (auth.uid() = "client_id" OR public.is_chef_owner("chef_id"));

-- ----------------------------------------------------------------------------
--  reviews — leitura pública (reputação); escrita só pelo autor
-- ----------------------------------------------------------------------------
CREATE POLICY "reviews_read_all" ON "reviews"
  FOR SELECT USING (true);
CREATE POLICY "reviews_write_author" ON "reviews"
  FOR INSERT WITH CHECK (auth.uid() = "reviewer_id");

-- ----------------------------------------------------------------------------
--  conversations / chat_messages — só os participantes
-- ----------------------------------------------------------------------------
CREATE POLICY "conv_parties" ON "conversations"
  FOR ALL USING (auth.uid() = "client_id" OR public.is_chef_owner("chef_id"))
  WITH CHECK (auth.uid() = "client_id" OR public.is_chef_owner("chef_id"));

CREATE POLICY "msg_read_parties" ON "chat_messages"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "conversations" c
      WHERE c."id" = "chat_messages"."conversation_id"
        AND (auth.uid() = c."client_id" OR public.is_chef_owner(c."chef_id"))
    )
  );
CREATE POLICY "msg_send_self" ON "chat_messages"
  FOR INSERT WITH CHECK (auth.uid() = "sender_id");

-- ----------------------------------------------------------------------------
--  payments — visível às partes do booking
-- ----------------------------------------------------------------------------
CREATE POLICY "payments_read_parties" ON "payments"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "bookings" b
      WHERE b."id" = "payments"."booking_id"
        AND (auth.uid() = b."client_id" OR public.is_chef_owner(b."chef_id"))
    )
  );
