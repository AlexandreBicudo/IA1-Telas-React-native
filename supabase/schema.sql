-- ============================================================================
--  SeuChefe Gourmet — Schema do banco de dados (PostgreSQL / Supabase)
--  Fase 2 — Modelagem de dados
--
--  Convenções: identificadores entre aspas duplas ("); o operador "||" é a
--  concatenação de strings do PostgreSQL (usado em buscas por nome completo).
--  Execute este arquivo no SQL Editor do Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Tipos enumerados (domínios do negócio)
-- ----------------------------------------------------------------------------
CREATE TYPE "user_role"           AS ENUM ('cliente', 'chef');
CREATE TYPE "verification_status" AS ENUM ('pendente', 'aprovado', 'rejeitado');
CREATE TYPE "service_type"        AS ENUM ('diaria', 'evento');
CREATE TYPE "booking_status"      AS ENUM ('solicitado', 'confirmado', 'em_andamento', 'concluido', 'cancelado');
CREATE TYPE "payment_method"      AS ENUM ('pix', 'cartao');
CREATE TYPE "payment_status"      AS ENUM ('pendente', 'pago', 'estornado');

-- ----------------------------------------------------------------------------
--  profiles — dados comuns a todos os usuários (estende auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE "profiles" (
    "id"         uuid PRIMARY KEY REFERENCES auth."users"("id") ON DELETE CASCADE,
    "role"       "user_role" NOT NULL DEFAULT 'cliente',
    "full_name"  text NOT NULL,
    "phone"      text,
    "avatar_url" text,
    "city"       text,
    "state"      text,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
--  chef_profiles — perfil profissional (1:1 com profiles quando role = 'chef')
-- ----------------------------------------------------------------------------
CREATE TABLE "chef_profiles" (
    "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "profile_id"          uuid NOT NULL UNIQUE REFERENCES "profiles"("id") ON DELETE CASCADE,
    "headline"            text,
    "bio"                 text,
    "years_experience"    int  NOT NULL DEFAULT 0 CHECK ("years_experience" >= 0),
    "daily_rate"          numeric(10,2) NOT NULL DEFAULT 0 CHECK ("daily_rate" >= 0),
    "rating_avg"          numeric(2,1)  NOT NULL DEFAULT 0 CHECK ("rating_avg" BETWEEN 0 AND 5),
    "rating_count"        int  NOT NULL DEFAULT 0,
    "verification_status" "verification_status" NOT NULL DEFAULT 'pendente',
    "is_available"        boolean NOT NULL DEFAULT true,
    "created_at"          timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
--  specialties + chef_specialties (N:N) — culinárias / tipos de cozinha
-- ----------------------------------------------------------------------------
CREATE TABLE "specialties" (
    "id"   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL UNIQUE
);

CREATE TABLE "chef_specialties" (
    "chef_id"      uuid NOT NULL REFERENCES "chef_profiles"("id") ON DELETE CASCADE,
    "specialty_id" uuid NOT NULL REFERENCES "specialties"("id")   ON DELETE CASCADE,
    PRIMARY KEY ("chef_id", "specialty_id")
);

-- ----------------------------------------------------------------------------
--  work_experiences — histórico em restaurantes (validação de credibilidade)
-- ----------------------------------------------------------------------------
CREATE TABLE "work_experiences" (
    "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "chef_id"         uuid NOT NULL REFERENCES "chef_profiles"("id") ON DELETE CASCADE,
    "restaurant_name" text NOT NULL,
    "role"            text NOT NULL,
    "start_date"      date,
    "end_date"        date
);

-- ----------------------------------------------------------------------------
--  portfolio_items — pratos / fotos do portfólio do chef
-- ----------------------------------------------------------------------------
CREATE TABLE "portfolio_items" (
    "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "chef_id"     uuid NOT NULL REFERENCES "chef_profiles"("id") ON DELETE CASCADE,
    "image_url"   text NOT NULL,
    "title"       text NOT NULL,
    "description" text,
    "created_at"  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
--  chef_availability — agenda de disponibilidade do chef
-- ----------------------------------------------------------------------------
CREATE TABLE "chef_availability" (
    "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "chef_id"    uuid NOT NULL REFERENCES "chef_profiles"("id") ON DELETE CASCADE,
    "date"       date NOT NULL,
    "start_time" time NOT NULL,
    "end_time"   time NOT NULL,
    "is_booked"  boolean NOT NULL DEFAULT false,
    CHECK ("end_time" > "start_time")
);

-- ----------------------------------------------------------------------------
--  bookings — agendamentos / contratações (núcleo do negócio)
-- ----------------------------------------------------------------------------
CREATE TABLE "bookings" (
    "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "client_id"    uuid NOT NULL REFERENCES "profiles"("id")      ON DELETE RESTRICT,
    "chef_id"      uuid NOT NULL REFERENCES "chef_profiles"("id") ON DELETE RESTRICT,
    "service_type" "service_type" NOT NULL,
    "event_date"   timestamptz NOT NULL,
    "guests_count" int NOT NULL DEFAULT 1 CHECK ("guests_count" > 0),
    "address"      text NOT NULL,
    "notes"        text,
    "total_price"  numeric(10,2) NOT NULL CHECK ("total_price" >= 0),
    "status"       "booking_status" NOT NULL DEFAULT 'solicitado',
    "created_at"   timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
--  reviews — avaliação bidirecional (cliente <-> chef) por booking
-- ----------------------------------------------------------------------------
CREATE TABLE "reviews" (
    "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "booking_id"  uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
    "reviewer_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
    "reviewee_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
    "rating"      int  NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
    "comment"     text,
    "created_at"  timestamptz NOT NULL DEFAULT now(),
    -- cada autor avalia uma vez por booking
    UNIQUE ("booking_id", "reviewer_id")
);

-- ----------------------------------------------------------------------------
--  conversations + chat_messages — chat interno (alimenta o Realtime)
-- ----------------------------------------------------------------------------
CREATE TABLE "conversations" (
    "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "client_id"  uuid NOT NULL REFERENCES "profiles"("id")      ON DELETE CASCADE,
    "chef_id"    uuid NOT NULL REFERENCES "chef_profiles"("id") ON DELETE CASCADE,
    "booking_id" uuid REFERENCES "bookings"("id") ON DELETE SET NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("client_id", "chef_id")
);

CREATE TABLE "chat_messages" (
    "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
    "sender_id"       uuid NOT NULL REFERENCES "profiles"("id")      ON DELETE CASCADE,
    "content"         text NOT NULL,
    "read_at"         timestamptz,
    "created_at"      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
--  payments — transação por booking (Pix / cartão). Apenas registro:
--  o sistema NÃO gerencia logística de insumos nem vínculo CLT (fora de escopo).
-- ----------------------------------------------------------------------------
CREATE TABLE "payments" (
    "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "booking_id"  uuid NOT NULL UNIQUE REFERENCES "bookings"("id") ON DELETE CASCADE,
    "method"      "payment_method" NOT NULL,
    "status"      "payment_status" NOT NULL DEFAULT 'pendente',
    "amount"      numeric(10,2) NOT NULL CHECK ("amount" >= 0),
    "chef_payout" numeric(10,2) NOT NULL DEFAULT 0 CHECK ("chef_payout" >= 0),
    "created_at"  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
--  Índices para a busca e filtragem avançada
-- ----------------------------------------------------------------------------
CREATE INDEX "idx_chef_rating"      ON "chef_profiles" ("rating_avg" DESC);
CREATE INDEX "idx_chef_daily_rate"  ON "chef_profiles" ("daily_rate");
CREATE INDEX "idx_chef_available"   ON "chef_profiles" ("is_available");
CREATE INDEX "idx_bookings_chef"    ON "bookings" ("chef_id");
CREATE INDEX "idx_bookings_client"  ON "bookings" ("client_id");
CREATE INDEX "idx_messages_conv"    ON "chat_messages" ("conversation_id", "created_at");

-- Exemplo de busca textual por nome completo + cidade usando o operador "||":
--   SELECT * FROM "profiles"
--   WHERE ("full_name" || ' ' || COALESCE("city", '')) ILIKE '%' || :termo || '%';
