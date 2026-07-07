import { describe, expect, it, vi } from 'vitest';
import { classifyCycleSignal } from './cycle-signal-classifier';
import { detectCycleSignal } from './cycle-signal-keywords';
import type OpenAI from 'openai';

function makeClient(response: unknown): { client: OpenAI; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn().mockResolvedValue({
    choices: [{ message: { content: typeof response === 'string' ? response : JSON.stringify(response) } }]
  });
  const client = { chat: { completions: { create } } } as unknown as OpenAI;
  return { client, create };
}

function makeClientRejecting(err: Error): OpenAI {
  const create = vi.fn().mockRejectedValue(err);
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

const layer1For = (msg: string) => detectCycleSignal(msg);

describe('classifyCycleSignal — categorías happy path', () => {
  it('clinical-red-s cuando el LLM lo dice', async () => {
    const { client } = makeClient({ category: 'clinical-red-s' });
    const msg = 'hace 4 meses que no me baja desde que aumenté el volumen';
    const r = await classifyCycleSignal(client, msg, layer1For(msg));
    expect(r.category).toBe('clinical-red-s');
    expect(r.error).toBeUndefined();
  });

  it('clinical-amenorrhea', async () => {
    const { client } = makeClient({ category: 'clinical-amenorrhea' });
    const r = await classifyCycleSignal(client, 'no me viene hace 5 meses', layer1For('no me viene hace 5 meses'));
    expect(r.category).toBe('clinical-amenorrhea');
  });

  it('clinical-severe-pain', async () => {
    const { client } = makeClient({ category: 'clinical-severe-pain' });
    const msg = 'dolor insoportable, no puedo moverme';
    const r = await classifyCycleSignal(client, msg, layer1For(msg));
    expect(r.category).toBe('clinical-severe-pain');
  });

  it('variacion-normal', async () => {
    const { client } = makeClient({ category: 'variacion-normal' });
    const msg = 'estoy en mis días y sin energía';
    const r = await classifyCycleSignal(client, msg, layer1For(msg));
    expect(r.category).toBe('variacion-normal');
  });

  it('other', async () => {
    const { client } = makeClient({ category: 'other' });
    const r = await classifyCycleSignal(client, '¿el ciclo afecta el grado?', layer1For('¿el ciclo afecta el grado?'));
    expect(r.category).toBe('other');
  });
});

describe('classifyCycleSignal — fail-safe hacia amenorrhea', () => {
  it('JSON inválido → clinical-amenorrhea + error json-parse-failed', async () => {
    const { client } = makeClient('this is not JSON');
    const r = await classifyCycleSignal(client, 'no me baja', layer1For('no me baja'));
    expect(r.category).toBe('clinical-amenorrhea');
    expect(r.error).toBe('json-parse-failed');
  });

  it('categoría inválida → clinical-amenorrhea + error invalid-category-value', async () => {
    const { client } = makeClient({ category: 'unknown-thing' });
    const r = await classifyCycleSignal(client, 'no me baja', layer1For('no me baja'));
    expect(r.category).toBe('clinical-amenorrhea');
    expect(r.error).toBe('invalid-category-value');
  });

  it('LLM tira → clinical-amenorrhea + error llm-call-failed', async () => {
    const client = makeClientRejecting(new Error('network down'));
    const r = await classifyCycleSignal(client, 'no me baja', layer1For('no me baja'));
    expect(r.category).toBe('clinical-amenorrhea');
    expect(r.error).toContain('llm-call-failed');
  });
});

describe('classifyCycleSignal — pasa layer1 y contexto al LLM', () => {
  it('el user block incluye señales detectadas por Layer 1', async () => {
    const { client, create } = makeClient({ category: 'clinical-red-s' });
    const msg = 'hace 4 meses que no me baja desde que aumenté el volumen';
    await classifyCycleSignal(client, msg, layer1For(msg));
    const call = create.mock.calls[0][0];
    const userBlock = call.messages[1].content;
    expect(userBlock).toContain('absence:');
    expect(userBlock).toContain('trainingLink:');
    expect(userBlock).toContain('monthsElapsed: 4');
  });

  it('pasa contexto reciente en el user block', async () => {
    const { client, create } = makeClient({ category: 'variacion-normal' });
    await classifyCycleSignal(
      client,
      'y hoy tampoco me viene',
      layer1For('y hoy tampoco me viene'),
      [
        { role: 'user', content: 'me vino hace un día' },
        { role: 'assistant', content: 'buena' }
      ]
    );
    const call = create.mock.calls[0][0];
    const userBlock = call.messages[1].content;
    expect(userBlock).toContain('Usuario: me vino hace un día');
    expect(userBlock).toContain('Senda: buena');
  });
});
