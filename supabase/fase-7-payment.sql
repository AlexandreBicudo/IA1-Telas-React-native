-- ============================================================================
--  SeuChefe Gourmet — Fase 7: Integração de pagamento
--  Execute no SQL Editor do Supabase APÓS fase-7-verification.sql
-- ============================================================================

-- Adiciona colunas que faltavam na tabela payments
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "external_payment_id" text,
  ADD COLUMN IF NOT EXISTS "gateway_ref"         text,
  ADD COLUMN IF NOT EXISTS "paid_at"             timestamptz;

-- Adiciona colunas de pagamento na tabela bookings
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "payment_method" "payment_method",
  ADD COLUMN IF NOT EXISTS "payment_status" "payment_status" NOT NULL DEFAULT 'pendente';

-- RPC que o cliente chama após o gateway confirmar o pagamento.
-- SECURITY DEFINER garante que só a lógica aqui pode mudar payment_status.
CREATE OR REPLACE FUNCTION public.fn_confirm_payment(
  p_booking_id  uuid,
  p_gateway_ref text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_booking_client_id uuid;
BEGIN
  -- Garante que apenas o cliente do booking pode chamar esta função
  SELECT client_id INTO v_booking_client_id
  FROM bookings WHERE id = p_booking_id;

  IF v_booking_client_id IS NULL THEN
    RAISE EXCEPTION 'Agendamento não encontrado.';
  END IF;
  IF v_booking_client_id <> auth.uid() THEN
    RAISE EXCEPTION 'Não autorizado.';
  END IF;

  -- Atualiza o registro de pagamento
  UPDATE payments
  SET status      = 'pago',
      gateway_ref = p_gateway_ref,
      paid_at     = now()
  WHERE booking_id = p_booking_id;

  -- Cria o registro se ainda não existia (fallback)
  IF NOT FOUND THEN
    INSERT INTO payments (booking_id, method, status, amount, chef_payout, gateway_ref, paid_at)
    SELECT p_booking_id, COALESCE(b.payment_method, 'pix'), 'pago',
           b.total_price, b.total_price * 0.85, p_gateway_ref, now()
    FROM bookings b WHERE b.id = p_booking_id;
  END IF;

  -- Marca o booking
  UPDATE bookings
  SET payment_status = 'pago',
      payment_method = COALESCE(payment_method, 'pix')
  WHERE id = p_booking_id;
END;
$$;

-- Política de INSERT na tabela payments (cliente cria o registro ao iniciar pagamento)
CREATE POLICY "payments_insert_client" ON "payments"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "bookings" b
      WHERE b."id" = "payments"."booking_id"
        AND auth.uid() = b."client_id"
    )
  );
