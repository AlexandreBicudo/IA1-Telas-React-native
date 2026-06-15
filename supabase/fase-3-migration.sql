-- ============================================================================
--  SeuChefe Gourmet — Fase 3: Faixa de datas + Precificação Dinâmica
--  Execute no SQL Editor do Supabase Dashboard.
-- ============================================================================

-- 1. Data de fim do evento (para eventos de múltiplos dias)
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "event_end_date" timestamptz;

-- 2. Tabela de preços dinâmica por faixa de dias no perfil do chef
--    Formato JSONB: [{"minDays":1,"maxDays":2,"ratePerDay":500}, ...]
--    maxDays null = sem limite superior (ex: 6+ dias)
ALTER TABLE "chef_profiles"
  ADD COLUMN IF NOT EXISTS "pricing_tiers" jsonb;
