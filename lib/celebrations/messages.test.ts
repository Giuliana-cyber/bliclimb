import { describe, expect, it } from 'vitest';
import {
  CELEBRATION_POOL,
  pickCelebrationMessage
} from './messages';

describe('CELEBRATION_POOL', () => {
  it('cada personaje tiene 20+ mensajes generales', () => {
    expect(CELEBRATION_POOL.bill.length).toBeGreaterThanOrEqual(20);
    expect(CELEBRATION_POOL.senda.length).toBeGreaterThanOrEqual(20);
  });

  it('milestones cubren 7/14/30/100 por personaje (voz diferenciada)', () => {
    for (const m of [7, 14, 30, 100] as const) {
      expect(CELEBRATION_POOL.billMilestones[m]).toBeTruthy();
      expect(CELEBRATION_POOL.sendaMilestones[m]).toBeTruthy();
      // Mensajes deben ser distintos entre personajes (voces propias).
      expect(CELEBRATION_POOL.billMilestones[m]).not.toBe(
        CELEBRATION_POOL.sendaMilestones[m]
      );
    }
  });
});

describe('pickCelebrationMessage', () => {
  it('usa milestone cuando se cruza 7/14/30/100', () => {
    expect(pickCelebrationMessage({ character: 'bill', milestone: 7 })).toBe(
      CELEBRATION_POOL.billMilestones[7]
    );
    expect(pickCelebrationMessage({ character: 'senda', milestone: 30 })).toBe(
      CELEBRATION_POOL.sendaMilestones[30]
    );
  });

  it('milestone 60 cae al pool normal (no tiene copy especial)', () => {
    const msg = pickCelebrationMessage({
      character: 'bill',
      milestone: 60,
      seed: 'sess-x'
    });
    expect(CELEBRATION_POOL.bill.includes(msg)).toBe(true);
  });

  it('sin milestone usa el pool del personaje correcto', () => {
    const billMsg = pickCelebrationMessage({
      character: 'bill',
      milestone: null,
      seed: 'sess-1'
    });
    expect(CELEBRATION_POOL.bill.includes(billMsg)).toBe(true);

    const sendaMsg = pickCelebrationMessage({
      character: 'senda',
      milestone: null,
      seed: 'sess-1'
    });
    expect(CELEBRATION_POOL.senda.includes(sendaMsg)).toBe(true);
  });

  it('mismo seed = mismo mensaje (determinista)', () => {
    const a = pickCelebrationMessage({ character: 'bill', seed: 'abc' });
    const b = pickCelebrationMessage({ character: 'bill', seed: 'abc' });
    expect(a).toBe(b);
  });

  it('seeds distintos típicamente dan mensajes distintos', () => {
    // Probamos 10 seeds, esperamos al menos 5 mensajes distintos.
    const messages = new Set<string>();
    for (let i = 0; i < 10; i += 1) {
      messages.add(pickCelebrationMessage({ character: 'senda', seed: `s-${i}` }));
    }
    expect(messages.size).toBeGreaterThanOrEqual(5);
  });
});
