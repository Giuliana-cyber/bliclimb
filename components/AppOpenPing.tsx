'use client';

import { useEffect } from 'react';

/**
 * Fire-and-forget al endpoint /api/app-open para registrar que el usuario
 * abrió la app hoy (mantiene viva la racha aunque no haga sesión ni
 * check-in). El endpoint es idempotente por (user, date).
 *
 * Solo se monta una vez por carga inicial — no envía un ping por cada
 * navegación cliente. No bloquea ni espera respuesta.
 */
export function AppOpenPing() {
  useEffect(() => {
    fetch('/api/app-open', { method: 'POST', keepalive: true }).catch(() => {
      // ignore — racha es best-effort
    });
  }, []);
  return null;
}
