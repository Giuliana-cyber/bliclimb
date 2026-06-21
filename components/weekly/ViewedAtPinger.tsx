'use client';

import { useEffect } from 'react';

/**
 * Marca el resumen semanal como visto (POST /api/weekly-summary).
 * Lo monta la página /resumen-semanal al render — fire-and-forget.
 */
export function ViewedAtPinger({ weekNumber }: { weekNumber: number }) {
  useEffect(() => {
    fetch('/api/weekly-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekNumber }),
      keepalive: true
    }).catch(() => {
      // ignore
    });
  }, [weekNumber]);
  return null;
}
