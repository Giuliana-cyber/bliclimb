import { describe, expect, it } from 'vitest';
import { buildWeeklyMessage } from './build';

describe('buildWeeklyMessage', () => {
  it('completitud 100% + racha alta menciona ambos (Bill)', () => {
    const msg = buildWeeklyMessage({
      character: 'bill',
      sessionsCompleted: 3,
      sessionsTotal: 3,
      averageRPE: 6,
      fingerPainAvg: 1,
      currentStreak: 14
    });
    expect(msg).toMatch(/14/);
    expect(msg.length).toBeGreaterThan(20);
  });

  it('completitud 100% en Senda con racha alta es cálido', () => {
    const msg = buildWeeklyMessage({
      character: 'senda',
      sessionsCompleted: 3,
      sessionsTotal: 3,
      averageRPE: 6,
      fingerPainAvg: 1,
      currentStreak: 14
    });
    expect(msg).toMatch(/14/);
  });

  it('dolor de dedos alto bloquea el mensaje genérico y alerta', () => {
    const msg = buildWeeklyMessage({
      character: 'bill',
      sessionsCompleted: 2,
      sessionsTotal: 4,
      averageRPE: 7,
      fingerPainAvg: 4,
      currentStreak: 4
    });
    expect(msg).toMatch(/dedos/i);
  });

  it('RPE alto sin completitud lo menciona', () => {
    const msg = buildWeeklyMessage({
      character: 'bill',
      sessionsCompleted: 2,
      sessionsTotal: 4,
      averageRPE: 9,
      fingerPainAvg: 1,
      currentStreak: 3
    });
    expect(msg).toMatch(/RPE|límite|pulse/i);
  });

  it('cero completadas tiene tono de "vuelta"', () => {
    const msgBill = buildWeeklyMessage({
      character: 'bill',
      sessionsCompleted: 0,
      sessionsTotal: 4,
      averageRPE: null,
      fingerPainAvg: null,
      currentStreak: 0
    });
    expect(msgBill).toMatch(/cero|arrancá/i);

    const msgSenda = buildWeeklyMessage({
      character: 'senda',
      sessionsCompleted: 0,
      sessionsTotal: 4,
      averageRPE: null,
      fingerPainAvg: null,
      currentStreak: 0
    });
    expect(msgSenda).toMatch(/volver|salió|recuperá/i);
  });

  it('mensajes distintos entre Bill y Senda para el mismo input', () => {
    const inputs = {
      sessionsCompleted: 2,
      sessionsTotal: 3,
      averageRPE: 6,
      fingerPainAvg: 2,
      currentStreak: 5
    } as const;
    const bill = buildWeeklyMessage({ character: 'bill', ...inputs });
    const senda = buildWeeklyMessage({ character: 'senda', ...inputs });
    expect(bill).not.toBe(senda);
  });
});
