// Cubre Bloque 1 (audit-360): /billing/success debe mostrar el copy
// correcto según el ciclo real que Stripe devuelve. Los tres valores
// posibles vienen del retrieve server-side por session_id.
//
// Los textos exactos fueron aprobados por Giuliana antes del commit —
// cualquier cambio futuro debe pasar por review de producto.

import { describe, expect, it } from 'vitest';
import {
  BILLING_SUCCESS_COPY,
  selectBillingSuccessDescription
} from '@/components/billing/billing-success-copy';

describe('BillingSuccess — copy exacto por ciclo (Bloque 1 audit-360)', () => {
  it('monthly: precio real + renovación mensual + "desde Ajustes"', () => {
    expect(selectBillingSuccessDescription('monthly')).toBe(
      'Tienes 30 días de prueba gratuita. Después se cobran $29 MXN al mes. Se renueva automáticamente cada mes; puedes cancelar cuando quieras desde Ajustes.'
    );
    expect(BILLING_SUCCESS_COPY.monthly).toContain('$29 MXN al mes');
    expect(BILLING_SUCCESS_COPY.monthly).toContain('Se renueva automáticamente cada mes');
    expect(BILLING_SUCCESS_COPY.monthly).not.toContain('$249');
  });

  it('annual: precio real + renovación anual + "desde Ajustes"', () => {
    expect(selectBillingSuccessDescription('annual')).toBe(
      'Tienes 30 días de prueba gratuita. Después se cobran $249 MXN al año. Se renueva automáticamente cada año; puedes cancelar cuando quieras desde Ajustes.'
    );
    expect(BILLING_SUCCESS_COPY.annual).toContain('$249 MXN al año');
    expect(BILLING_SUCCESS_COPY.annual).toContain('Se renueva automáticamente cada año');
    // Cero rastro del copy viejo "una sola vez al año" (H-01).
    expect(BILLING_SUCCESS_COPY.annual).not.toContain('una sola vez');
  });

  it('fallback (null → sin session_id o retrieve falló): honesto, sin precio inventado', () => {
    expect(selectBillingSuccessDescription(null)).toBe(
      'Tienes 30 días de prueba gratuita. Después se cobra tu plan según el ciclo que elegiste (mensual o anual). Se renueva automáticamente; puedes cancelar cuando quieras desde Ajustes.'
    );
    // No debe afirmar un precio específico — es el whole point del fallback.
    expect(BILLING_SUCCESS_COPY.fallback).not.toContain('$29');
    expect(BILLING_SUCCESS_COPY.fallback).not.toContain('$249');
    expect(BILLING_SUCCESS_COPY.fallback).toContain('según el ciclo que elegiste');
  });

  it('undefined también cae al fallback (defensivo: prop no seteada)', () => {
    expect(selectBillingSuccessDescription(null)).toBe(BILLING_SUCCESS_COPY.fallback);
  });

  it('los tres copies mencionan "Ajustes" (no "/settings" ni "vos")', () => {
    for (const key of ['monthly', 'annual', 'fallback'] as const) {
      expect(BILLING_SUCCESS_COPY[key]).toContain('Ajustes');
      // Voz TÚ — cero voseo en imperativos.
      expect(BILLING_SUCCESS_COPY[key]).not.toContain('/settings');
      expect(BILLING_SUCCESS_COPY[key]).not.toMatch(/\b(tenés|cancelás|elegís|refrescá|esperá)\b/);
    }
  });
});
