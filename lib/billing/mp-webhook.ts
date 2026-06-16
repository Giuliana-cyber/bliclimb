import crypto from 'node:crypto';

/**
 * Verifica firma del webhook de Mercado Pago.
 *
 * Patrón oficial:
 *   - header `x-signature` viene como `ts=<timestamp>,v1=<hash>`
 *   - header `x-request-id` identifica la entrega
 *   - hash = HMAC_SHA256(secret, `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`)
 *
 * Docs: https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks
 */
export type WebhookSignatureCheck =
  | { valid: true; ts: string; v1: string }
  | { valid: false; reason: string };

export function verifyMercadoPagoSignature({
  xSignature,
  xRequestId,
  dataId,
  secret
}: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null | undefined;
  secret: string;
}): WebhookSignatureCheck {
  if (!secret) {
    return { valid: false, reason: 'missing_secret' };
  }
  if (!xSignature || !xRequestId) {
    return { valid: false, reason: 'missing_headers' };
  }
  if (!dataId) {
    return { valid: false, reason: 'missing_data_id' };
  }

  // Parse "ts=..., v1=..."
  const parts = xSignature.split(',').map((p) => p.trim());
  const tsPart = parts.find((p) => p.startsWith('ts='));
  const v1Part = parts.find((p) => p.startsWith('v1='));
  const ts = tsPart?.slice(3);
  const v1 = v1Part?.slice(3);

  if (!ts || !v1) {
    return { valid: false, reason: 'malformed_signature' };
  }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  let equal = false;
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(v1, 'hex');
    equal = a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    equal = false;
  }

  if (!equal) {
    return { valid: false, reason: 'invalid_signature' };
  }

  return { valid: true, ts, v1 };
}

// ---------- Tipos del payload de MP (subset que consumimos) ----------

export type MpNotification = {
  // Notificación de payment
  // { type: 'payment', action: 'payment.created' | 'payment.updated', data: { id: '...' } }
  // Notificación de preapproval
  // { type: 'subscription_preapproval', action: 'updated', data: { id: '...' } }
  // Algunos payloads vienen con `topic` (legacy IPN) en lugar de `type`.
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string };
  user_id?: string | number;
  resource?: string;
};

export type MpPayment = {
  id: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string | null;
  payer?: { email?: string | null };
  metadata?: Record<string, unknown>;
  preapproval_id?: string | null;
  date_approved?: string | null;
};

export type MpPreapproval = {
  id: string;
  status?: string;
  external_reference?: string | null;
  payer_email?: string | null;
  date_created?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: 'days' | 'months';
  } | null;
};

/**
 * Mapea el status que devuelve MP al enum interno de entitlements.
 */
export function mapPaymentStatus(
  status: string | undefined
): 'active' | 'past_due' | 'pending' | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === 'approved') return 'active';
  if (s === 'rejected' || s === 'cancelled' || s === 'refunded' || s === 'charged_back') {
    return 'past_due';
  }
  if (s === 'pending' || s === 'in_process' || s === 'authorized') return 'pending';
  return null;
}

export function mapPreapprovalStatus(
  status: string | undefined
): 'active' | 'cancelled' | 'paused' | 'pending' | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === 'authorized') return 'active';
  if (s === 'cancelled' || s === 'cancelled_by_collector' || s === 'cancelled_by_payer') {
    return 'cancelled';
  }
  if (s === 'paused') return 'paused';
  if (s === 'pending') return 'pending';
  return null;
}

/**
 * Calcula `current_period_end` a partir de una preapproval (frecuencia mensual default).
 */
export function inferPeriodEnd(
  preapproval: MpPreapproval | null,
  from: Date = new Date()
): string {
  if (preapproval?.next_payment_date) {
    return preapproval.next_payment_date;
  }

  const freq = preapproval?.auto_recurring?.frequency ?? 1;
  const type = preapproval?.auto_recurring?.frequency_type ?? 'months';
  const end = new Date(from);
  if (type === 'days') {
    end.setUTCDate(end.getUTCDate() + freq);
  } else {
    end.setUTCMonth(end.getUTCMonth() + freq);
  }
  return end.toISOString();
}
