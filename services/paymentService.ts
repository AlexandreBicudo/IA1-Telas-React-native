/**
 * Pagamentos via Mercado Pago (REST API).
 *
 * Em modo mock devolve dados simulados realistas.
 * Com Supabase configurado, chama a Edge Function `mp-create-payment`
 * (ou a API MP diretamente, dependendo da configuração do projeto).
 *
 * ACCESS TOKEN do MP deve estar em process.env.EXPO_PUBLIC_MP_ACCESS_TOKEN
 * (para uso em Edge Function é MERCADOPAGO_ACCESS_TOKEN — server-side apenas).
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { PaymentMethod, PaymentStatus } from '@/types/database';

export interface PixPaymentResult {
  paymentId: string;
  qrCode: string;       // Código PIX copia-e-cola
  qrCodeBase64: string; // Imagem do QR para exibição
  expiresAt: string;    // ISO timestamp de expiração
  status: PaymentStatus;
}

export interface CardPaymentResult {
  paymentId: string;
  status: PaymentStatus;
  statusDetail: string;
}

export interface PaymentStatusResult {
  paymentId: string;
  status: PaymentStatus;
  method: PaymentMethod;
  paidAt: string | null;
}

const MOCK_QR_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function mockPaymentId() {
  return `mock-pay-${Date.now()}`;
}

/** Cria um pagamento PIX via Mercado Pago. Retorna QR Code e código copia-e-cola. */
export async function createPixPayment(
  bookingId: string,
  amount: number,
  description: string,
): Promise<PixPaymentResult> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 1000));
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    return {
      paymentId: mockPaymentId(),
      qrCode: `00020126580014br.gov.bcb.pix0136${bookingId}5204000053039865802BR5925SeuChefe Gourmet6009SAO PAULO62070503***63041D3D`,
      qrCodeBase64: MOCK_QR_BASE64,
      expiresAt,
      status: 'pendente',
    };
  }

  // Chama Edge Function que mantém o access token server-side
  const { data, error } = await supabase.functions.invoke('mp-create-payment', {
    body: {
      booking_id: bookingId,
      amount,
      description,
      payment_method: 'pix',
    },
  });
  if (error) throw new Error(error.message ?? 'Falha ao criar pagamento PIX.');

  await _ensurePaymentRecord(bookingId, amount, 'pix', data.payment_id);

  return {
    paymentId: String(data.payment_id),
    qrCode: data.point_of_interaction?.transaction_data?.qr_code ?? '',
    qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64 ?? '',
    expiresAt: data.date_of_expiration ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    status: _mapMpStatus(data.status),
  };
}

/** Cria um pagamento com cartão de crédito usando o token gerado pelo MP. */
export async function createCardPayment(
  bookingId: string,
  amount: number,
  cardToken: string,
  installments: number,
  paymentMethodId: string,
): Promise<CardPaymentResult> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 1200));
    return { paymentId: mockPaymentId(), status: 'pago', statusDetail: 'accredited' };
  }

  const { data, error } = await supabase.functions.invoke('mp-create-payment', {
    body: {
      booking_id: bookingId,
      amount,
      payment_method: 'cartao',
      card_token: cardToken,
      installments,
      payment_method_id: paymentMethodId,
    },
  });
  if (error) throw new Error(error.message ?? 'Falha ao processar cartão.');

  await _ensurePaymentRecord(bookingId, amount, 'cartao', data.payment_id);

  const status = _mapMpStatus(data.status);
  if (status === 'pago') {
    await _confirmPaymentInDB(bookingId, String(data.payment_id));
  }

  return {
    paymentId: String(data.payment_id),
    status,
    statusDetail: data.status_detail ?? '',
  };
}

/** Consulta o status atual de um pagamento no banco local (não chama a API MP). */
export async function getPaymentStatus(bookingId: string): Promise<PaymentStatusResult | null> {
  if (!isSupabaseConfigured) {
    return { paymentId: 'mock-pay-1', status: 'pendente', method: 'pix', paidAt: null };
  }

  const { data } = await supabase
    .from('payments')
    .select('external_payment_id, gateway_ref, status, method, paid_at')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (!data) return null;

  return {
    paymentId: data.external_payment_id ?? data.gateway_ref ?? '',
    status: data.status as PaymentStatus,
    method: data.method as PaymentMethod,
    paidAt: (data as any).paid_at ?? null,
  };
}

/** Confirma o pagamento chamando a RPC SECURITY DEFINER. */
export async function confirmPayment(bookingId: string, gatewayRef: string): Promise<void> {
  if (!isSupabaseConfigured) {
    await new Promise((r) => setTimeout(r, 500));
    return;
  }
  await _confirmPaymentInDB(bookingId, gatewayRef);
}

// ─── Helpers internos ────────────────────────────────────────────────────────

async function _confirmPaymentInDB(bookingId: string, gatewayRef: string): Promise<void> {
  const { error } = await supabase.rpc('fn_confirm_payment', {
    p_booking_id: bookingId,
    p_gateway_ref: gatewayRef,
  });
  if (error) throw error;
}

async function _ensurePaymentRecord(
  bookingId: string,
  amount: number,
  method: PaymentMethod,
  externalId: string | number,
): Promise<void> {
  // Upsert silencioso — o registro pode já existir se o cliente tentou antes
  await supabase.from('payments').upsert(
    {
      booking_id: bookingId,
      method,
      status: 'pendente',
      amount,
      chef_payout: amount * 0.85,
      external_payment_id: String(externalId),
    },
    { onConflict: 'booking_id', ignoreDuplicates: false },
  );
}

function _mapMpStatus(mpStatus: string): PaymentStatus {
  if (mpStatus === 'approved') return 'pago';
  if (mpStatus === 'refunded' || mpStatus === 'charged_back') return 'estornado';
  return 'pendente';
}
