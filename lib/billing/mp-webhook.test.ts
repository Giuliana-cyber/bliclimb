import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import {
  inferPeriodEnd,
  mapPaymentStatus,
  mapPreapprovalStatus,
  verifyMercadoPagoSignature
} from './mp-webhook';

function sign(
  secret: string,
  ts: string,
  requestId: string,
  dataId: string
): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return crypto.createHmac('sha256', secret).update(manifest).digest('hex');
}

describe('verifyMercadoPagoSignature', () => {
  const secret = 'top-secret-mp-webhook-key';

  it('valida una firma correcta', () => {
    const ts = '1700000000';
    const requestId = 'req-123';
    const dataId = 'pay-42';
    const hash = sign(secret, ts, requestId, dataId);
    const result = verifyMercadoPagoSignature({
      xSignature: `ts=${ts},v1=${hash}`,
      xRequestId: requestId,
      dataId,
      secret
    });
    expect(result.valid).toBe(true);
  });

  it('rechaza si la firma fue computada con otro secret', () => {
    const ts = '1700000000';
    const requestId = 'req-123';
    const dataId = 'pay-42';
    const hash = sign('wrong-secret', ts, requestId, dataId);
    const result = verifyMercadoPagoSignature({
      xSignature: `ts=${ts},v1=${hash}`,
      xRequestId: requestId,
      dataId,
      secret
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('invalid_signature');
    }
  });

  it('rechaza si falta header x-signature', () => {
    const result = verifyMercadoPagoSignature({
      xSignature: null,
      xRequestId: 'req-1',
      dataId: 'pay-1',
      secret
    });
    expect(result.valid).toBe(false);
  });

  it('rechaza si falta data.id', () => {
    const result = verifyMercadoPagoSignature({
      xSignature: 'ts=1,v1=abc',
      xRequestId: 'req-1',
      dataId: null,
      secret
    });
    expect(result.valid).toBe(false);
  });

  it('rechaza si el header está malformado', () => {
    const result = verifyMercadoPagoSignature({
      xSignature: 'wrong-format',
      xRequestId: 'req-1',
      dataId: 'pay-1',
      secret
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('malformed_signature');
    }
  });

  it('rechaza si no hay secret configurado (deploy mal seteado)', () => {
    const result = verifyMercadoPagoSignature({
      xSignature: 'ts=1,v1=abc',
      xRequestId: 'req-1',
      dataId: 'pay-1',
      secret: ''
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('missing_secret');
    }
  });
});

describe('mapPaymentStatus', () => {
  it('approved → active', () => {
    expect(mapPaymentStatus('approved')).toBe('active');
  });
  it('rejected → past_due', () => {
    expect(mapPaymentStatus('rejected')).toBe('past_due');
  });
  it('pending → pending', () => {
    expect(mapPaymentStatus('pending')).toBe('pending');
  });
  it('desconocido → null', () => {
    expect(mapPaymentStatus('weird_status')).toBeNull();
  });
});

describe('mapPreapprovalStatus', () => {
  it('authorized → active', () => {
    expect(mapPreapprovalStatus('authorized')).toBe('active');
  });
  it('cancelled_by_payer → cancelled', () => {
    expect(mapPreapprovalStatus('cancelled_by_payer')).toBe('cancelled');
  });
  it('paused → paused', () => {
    expect(mapPreapprovalStatus('paused')).toBe('paused');
  });
});

describe('inferPeriodEnd', () => {
  it('usa next_payment_date si está', () => {
    const result = inferPeriodEnd(
      {
        id: 'sub_1',
        next_payment_date: '2030-01-15T00:00:00Z'
      },
      new Date('2030-01-01T00:00:00Z')
    );
    expect(result).toBe('2030-01-15T00:00:00Z');
  });

  it('cae a +1 mes desde "from" si no hay next_payment_date', () => {
    const from = new Date('2026-06-15T10:00:00Z');
    const result = inferPeriodEnd(null, from);
    expect(result.startsWith('2026-07-15')).toBe(true);
  });

  it('respeta frequency_type=days', () => {
    const from = new Date('2026-06-15T00:00:00Z');
    const result = inferPeriodEnd(
      {
        id: 'sub_1',
        auto_recurring: { frequency: 7, frequency_type: 'days' }
      },
      from
    );
    expect(result.startsWith('2026-06-22')).toBe(true);
  });
});
