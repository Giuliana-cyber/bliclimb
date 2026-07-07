import { describe, expect, it, vi } from 'vitest';
import { checkSendaDerivation } from './senda-derivation-orchestrator';
import {
  SENDA_DERIVATION_1_RED_S,
  SENDA_DERIVATION_2_AMENORRHEA,
  SENDA_DERIVATION_3_SEVERE_PAIN
} from '../messages/senda-derivations';
import type OpenAI from 'openai';

/**
 * Mock que responde secuencialmente: primera llamada = classifier,
 * segunda = warmth. Cuando derive=false no llamamos warmth.
 */
function makeClient(responses: string[]): OpenAI {
  let call = 0;
  const create = vi.fn().mockImplementation(async () => {
    const r = responses[call] ?? '';
    call++;
    return { choices: [{ message: { content: r } }] };
  });
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

describe('checkSendaDerivation — no-signal (Layer 1 no dispara)', () => {
  it('mensaje neutro → no derive, sin llamar LLM', async () => {
    const client = makeClient([]);
    const r = await checkSendaDerivation(
      client,
      'quiero mejorar mi hangboard'
    );
    expect(r.derive).toBe(false);
    if (!r.derive) expect(r.reason).toBe('no-signal');
  });

  it('"estoy en mis días" → no derive (Layer 1 no matchea)', async () => {
    const client = makeClient([]);
    const r = await checkSendaDerivation(
      client,
      'estoy en mis días y sin energía'
    );
    expect(r.derive).toBe(false);
    if (!r.derive) expect(r.reason).toBe('no-signal');
  });
});

describe('checkSendaDerivation — variacion-normal (Layer 2 filtra)', () => {
  it('Layer 1 dispara pero Layer 2 clasifica variacion-normal → no derive', async () => {
    const client = makeClient([
      JSON.stringify({ category: 'variacion-normal' })
    ]);
    const r = await checkSendaDerivation(
      client,
      'no me baja pero es normal por el estrés' // hipotético — dispara "no me baja"
    );
    expect(r.derive).toBe(false);
    if (!r.derive && 'reason' in r) expect(r.reason).toBe('variacion-normal');
  });

  it('Layer 2 clasifica other → no derive', async () => {
    const client = makeClient([JSON.stringify({ category: 'other' })]);
    const r = await checkSendaDerivation(
      client,
      'una amiga tuvo amenorrea, ¿es común?'
    );
    expect(r.derive).toBe(false);
    if (!r.derive && 'reason' in r) expect(r.reason).toBe('other');
  });
});

describe('checkSendaDerivation — DERIVA con núcleo verbatim', () => {
  it('RED-S detectado → composed contiene Derivación 1 verbatim', async () => {
    const client = makeClient([
      JSON.stringify({ category: 'clinical-red-s' }),
      'Gracias por contarme esto.'
    ]);
    const r = await checkSendaDerivation(
      client,
      'hace 4 meses que no me baja desde que aumenté el volumen'
    );
    expect(r.derive).toBe(true);
    if (r.derive) {
      expect(r.category).toBe('clinical-red-s');
      expect(r.kind).toBe('red-s');
      expect(r.composed.verbatimCore).toBe(SENDA_DERIVATION_1_RED_S);
      expect(r.composed.fullMessage).toContain(SENDA_DERIVATION_1_RED_S);
      expect(r.composed.fullMessage.startsWith('Gracias por contarme esto.')).toBe(true);
      expect(r.composed.usedFallback).toBe(false);
    }
  });

  it('Amenorrea detectada → Derivación 2 verbatim', async () => {
    const client = makeClient([
      JSON.stringify({ category: 'clinical-amenorrhea' }),
      'Te agradezco la confianza.'
    ]);
    const r = await checkSendaDerivation(client, 'no me viene hace 6 meses');
    expect(r.derive).toBe(true);
    if (r.derive) {
      expect(r.kind).toBe('amenorrhea');
      expect(r.composed.verbatimCore).toBe(SENDA_DERIVATION_2_AMENORRHEA);
      expect(r.composed.fullMessage).toContain(SENDA_DERIVATION_2_AMENORRHEA);
    }
  });

  it('Dolor severo detectado → Derivación 3 verbatim', async () => {
    const client = makeClient([
      JSON.stringify({ category: 'clinical-severe-pain' }),
      'Sé lo que cuesta compartir esto.'
    ]);
    const r = await checkSendaDerivation(
      client,
      'dolor insoportable, no puedo moverme'
    );
    expect(r.derive).toBe(true);
    if (r.derive) {
      expect(r.kind).toBe('severe-pain');
      expect(r.composed.verbatimCore).toBe(SENDA_DERIVATION_3_SEVERE_PAIN);
      expect(r.composed.fullMessage).toContain(SENDA_DERIVATION_3_SEVERE_PAIN);
    }
  });

  it('warmth viola blacklist → fallback a núcleo solo', async () => {
    const client = makeClient([
      JSON.stringify({ category: 'clinical-amenorrhea' }),
      'No te preocupes, seguro no es nada.'
    ]);
    const r = await checkSendaDerivation(client, 'no me viene hace 6 meses');
    expect(r.derive).toBe(true);
    if (r.derive) {
      expect(r.composed.fullMessage).toBe(SENDA_DERIVATION_2_AMENORRHEA);
      expect(r.composed.usedFallback).toBe(true);
      expect(r.composed.fallbackReason).toBe('blacklist-violation');
    }
  });
});

describe('checkSendaDerivation — fail-safe hereda a amenorrhea', () => {
  it('classifier JSON inválido → clinical-amenorrhea + Derivación 2', async () => {
    const client = makeClient([
      'not json',
      'Gracias por contarlo.'
    ]);
    const r = await checkSendaDerivation(client, 'no me baja');
    expect(r.derive).toBe(true);
    if (r.derive) {
      expect(r.kind).toBe('amenorrhea');
      expect(r.composed.verbatimCore).toBe(SENDA_DERIVATION_2_AMENORRHEA);
      expect(r.layer2.error).toBe('json-parse-failed');
    }
  });
});
