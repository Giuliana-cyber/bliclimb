import { describe, expect, it, vi } from 'vitest';
import {
  composeDerivation,
  generateWarmth,
  violatesBlacklist
} from './senda-warmth-composer';
import {
  SENDA_DERIVATION_1_RED_S,
  SENDA_DERIVATION_2_AMENORRHEA,
  SENDA_DERIVATION_3_SEVERE_PAIN
} from '../messages/senda-derivations';
import type OpenAI from 'openai';

function makeClient(response: string): OpenAI {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: response } }]
        })
      }
    }
  } as unknown as OpenAI;
}

function makeClientRejecting(err: Error): OpenAI {
  return {
    chat: {
      completions: {
        create: vi.fn().mockRejectedValue(err)
      }
    }
  } as unknown as OpenAI;
}

// -------------------- Blacklist --------------------

describe('violatesBlacklist — descarta wrap peligrosa', () => {
  it.each([
    'no te preocupes, es común en escaladoras',
    'seguro no es nada grave, hablalo tranquila',
    'tranquila, esto suele pasar',
    'puede que no sea nada, pero por las dudas',
    'no es urgente, cuando puedas lo mirás',
    'es normal en estas etapas',
    'suele pasar, no te preocupes',
    'nada del otro mundo, relajá',
    'solo por si acaso, andá al médico'
  ])('DESCARTA: "%s"', (text) => {
    const r = violatesBlacklist(text);
    expect(r.violates).toBe(true);
    expect(r.matched.length).toBeGreaterThan(0);
  });

  it.each([
    'Gracias por contarme esto.',
    'Sé que abrirlo cuesta.',
    'Te agradezco que confíes en compartirlo.',
    'Escucho lo que me contás y valoro que lo compartas.',
    'Gracias por confiar en decirlo.'
  ])('PASA (wrap segura): "%s"', (text) => {
    const r = violatesBlacklist(text);
    expect(r.violates).toBe(false);
    expect(r.matched).toEqual([]);
  });
});

// -------------------- generateWarmth --------------------

describe('generateWarmth — happy path', () => {
  it('LLM devuelve wrap segura → warmth con reason ok', async () => {
    const client = makeClient('Gracias por contarme esto, sé que abrirlo cuesta.');
    const r = await generateWarmth(client, 'no me baja hace 4 meses', 'amenorrhea');
    expect(r.warmth).toBe('Gracias por contarme esto, sé que abrirlo cuesta.');
    expect(r.usedFallback).toBe(false);
    expect(r.reason).toBe('ok');
  });
});

describe('generateWarmth — fail-safe', () => {
  it('LLM devuelve blacklist → warmth vacía + reason blacklist-violation', async () => {
    const client = makeClient('No te preocupes, seguro no es nada grave.');
    const r = await generateWarmth(client, 'no me baja', 'amenorrhea');
    expect(r.warmth).toBe('');
    expect(r.usedFallback).toBe(true);
    expect(r.reason).toBe('blacklist-violation');
    expect(r.matched).toBeDefined();
    expect(r.matched!.length).toBeGreaterThan(0);
  });

  it('LLM devuelve vacío → warmth vacía + reason empty-response', async () => {
    const client = makeClient('');
    const r = await generateWarmth(client, 'no me baja', 'amenorrhea');
    expect(r.warmth).toBe('');
    expect(r.reason).toBe('empty-response');
  });

  it('LLM tira error → warmth vacía + reason llm-error', async () => {
    const client = makeClientRejecting(new Error('network down'));
    const r = await generateWarmth(client, 'no me baja', 'amenorrhea');
    expect(r.warmth).toBe('');
    expect(r.reason).toBe('llm-error');
    expect(r.error).toContain('network down');
  });
});

// -------------------- Compositor --------------------

describe('composeDerivation — concatenación con núcleo verbatim intacto', () => {
  it('warmth OK + red-s → warmth + núcleo verbatim', () => {
    const c = composeDerivation(
      { warmth: 'Gracias por contarme esto.', usedFallback: false, reason: 'ok' },
      'red-s'
    );
    expect(c.warmth).toBe('Gracias por contarme esto.');
    expect(c.verbatimCore).toBe(SENDA_DERIVATION_1_RED_S);
    expect(c.fullMessage).toBe(
      `Gracias por contarme esto.\n\n${SENDA_DERIVATION_1_RED_S}`
    );
    expect(c.usedFallback).toBe(false);
  });

  it('warmth vacía + amenorrhea → solo núcleo verbatim, fallback flag', () => {
    const c = composeDerivation(
      {
        warmth: '',
        usedFallback: true,
        reason: 'blacklist-violation',
        matched: ['no te preocupes']
      },
      'amenorrhea'
    );
    expect(c.fullMessage).toBe(SENDA_DERIVATION_2_AMENORRHEA);
    expect(c.warmth).toBe('');
    expect(c.usedFallback).toBe(true);
    expect(c.fallbackReason).toBe('blacklist-violation');
  });

  it('el núcleo verbatim aparece LETRA POR LETRA en el mensaje final', () => {
    const c = composeDerivation(
      { warmth: 'Sé lo que cuesta abrir esto.', usedFallback: false, reason: 'ok' },
      'severe-pain'
    );
    expect(c.fullMessage).toContain(SENDA_DERIVATION_3_SEVERE_PAIN);
    expect(c.verbatimCore).toBe(SENDA_DERIVATION_3_SEVERE_PAIN);
  });

  it('el núcleo va SIEMPRE al final — no hay texto DESPUÉS del núcleo', () => {
    const c = composeDerivation(
      { warmth: 'Gracias por decirlo.', usedFallback: false, reason: 'ok' },
      'amenorrhea'
    );
    expect(c.fullMessage.endsWith(SENDA_DERIVATION_2_AMENORRHEA)).toBe(true);
  });
});

// -------------------- Integración generateWarmth + composeDerivation --------------------

describe('Compositor end-to-end (integration)', () => {
  it('flujo completo happy path: LLM segura → núcleo intacto + warmth antes', async () => {
    const client = makeClient('Te agradezco que lo compartas.');
    const wrap = await generateWarmth(client, 'hace 5 meses que no me baja', 'amenorrhea');
    const c = composeDerivation(wrap, 'amenorrhea');
    expect(c.fullMessage.startsWith('Te agradezco que lo compartas.')).toBe(true);
    expect(c.fullMessage.endsWith(SENDA_DERIVATION_2_AMENORRHEA)).toBe(true);
    expect(c.usedFallback).toBe(false);
  });

  it('flujo completo fail-safe: LLM viola blacklist → solo núcleo', async () => {
    const client = makeClient('Tranquila, es normal, no te preocupes.');
    const wrap = await generateWarmth(client, 'no me baja', 'amenorrhea');
    const c = composeDerivation(wrap, 'amenorrhea');
    expect(c.fullMessage).toBe(SENDA_DERIVATION_2_AMENORRHEA);
    expect(c.usedFallback).toBe(true);
    expect(c.fallbackReason).toBe('blacklist-violation');
  });
});
