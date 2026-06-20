import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  coachTierFromPriceId,
  getStripeCoachPriceId,
  getCoachTierLabel
} from './stripe';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.STRIPE_COACH_STARTER_PRICE_ID = 'price_starter';
  process.env.STRIPE_COACH_PRO_PRICE_ID = 'price_pro';
  process.env.STRIPE_COACH_GYM_PRICE_ID = 'price_gym';
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('coachTierFromPriceId', () => {
  it('resuelve cada tier por su env var', () => {
    expect(coachTierFromPriceId('price_starter')).toBe('starter');
    expect(coachTierFromPriceId('price_pro')).toBe('pro');
    expect(coachTierFromPriceId('price_gym')).toBe('gym');
  });
  it('null para price_id desconocido (ej. atleta)', () => {
    expect(coachTierFromPriceId('price_annual_athlete')).toBeNull();
  });
  it('null si el priceId es null/undefined/empty', () => {
    expect(coachTierFromPriceId(null)).toBeNull();
    expect(coachTierFromPriceId(undefined)).toBeNull();
    expect(coachTierFromPriceId('')).toBeNull();
  });
});

describe('getStripeCoachPriceId', () => {
  it('devuelve el price_id configurado por tier', () => {
    expect(getStripeCoachPriceId('starter')).toBe('price_starter');
    expect(getStripeCoachPriceId('pro')).toBe('price_pro');
    expect(getStripeCoachPriceId('gym')).toBe('price_gym');
  });
  it('throws si falta la env var', () => {
    delete process.env.STRIPE_COACH_PRO_PRICE_ID;
    expect(() => getStripeCoachPriceId('pro')).toThrow(/STRIPE_COACH_PRO_PRICE_ID/);
  });
});

describe('getCoachTierLabel', () => {
  it('etiquetas user-facing con precio + cupo', () => {
    expect(getCoachTierLabel('starter')).toContain('199');
    expect(getCoachTierLabel('pro')).toContain('15 clientes');
    expect(getCoachTierLabel('gym')).toContain('ilimitados');
  });
});
