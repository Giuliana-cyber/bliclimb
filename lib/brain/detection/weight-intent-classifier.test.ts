import { describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { classifyWeightIntent, type ConversationTurn } from './weight-intent-classifier';

// -------------------- Mock OpenAI client factory --------------------

type MockCallSpy = {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  response_format?: unknown;
  max_tokens?: number;
  temperature?: number;
};

function mockClientResponse(body: string): {
  client: OpenAI;
  spy: MockCallSpy;
} {
  const spy: MockCallSpy = {};
  const create = vi.fn(async (args: MockCallSpy) => {
    Object.assign(spy, args);
    return {
      choices: [{ message: { content: body } }]
    };
  });
  const client = { chat: { completions: { create } } } as unknown as OpenAI;
  return { client, spy };
}

function mockClientThrows(err: Error): OpenAI {
  const create = vi.fn(async () => {
    throw err;
  });
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

// -------------------- Tests happy path --------------------

describe("classifyWeightIntent — respuesta 'change-weight'", () => {
  it("parsea correctamente { intent: 'change-weight' }", async () => {
    const { client } = mockClientResponse('{"intent":"change-weight"}');
    const r = await classifyWeightIntent(client, 'quiero bajar de peso');
    expect(r.intent).toBe('change-weight');
    expect(r.error).toBeUndefined();
    expect(r.raw).toBe('{"intent":"change-weight"}');
  });
});

describe("classifyWeightIntent — respuesta 'informational'", () => {
  it("parsea { intent: 'informational' }", async () => {
    const { client } = mockClientResponse('{"intent":"informational"}');
    const r = await classifyWeightIntent(client, '¿el peso afecta el grado?');
    expect(r.intent).toBe('informational');
    expect(r.error).toBeUndefined();
  });
});

describe("classifyWeightIntent — respuesta 'other'", () => {
  it("parsea { intent: 'other' } (útil para negaciones tipo 'no quiero bajar de peso')", async () => {
    const { client } = mockClientResponse('{"intent":"other"}');
    const r = await classifyWeightIntent(client, 'no quiero bajar de peso');
    expect(r.intent).toBe('other');
    expect(r.error).toBeUndefined();
  });
});

// -------------------- Tests del prompt / args al modelo --------------------

describe('classifyWeightIntent — argumentos al modelo', () => {
  it('usa gpt-4o-mini por default', async () => {
    const { client, spy } = mockClientResponse('{"intent":"other"}');
    await classifyWeightIntent(client, 'test');
    expect(spy.model).toBe('gpt-4o-mini');
  });

  it('respeta opts.model override', async () => {
    const { client, spy } = mockClientResponse('{"intent":"other"}');
    await classifyWeightIntent(client, 'test', [], { model: 'gpt-4o' });
    expect(spy.model).toBe('gpt-4o');
  });

  it('temperature 0 + max_tokens 50 + response_format json_object', async () => {
    const { client, spy } = mockClientResponse('{"intent":"other"}');
    await classifyWeightIntent(client, 'test');
    expect(spy.temperature).toBe(0);
    expect(spy.max_tokens).toBe(50);
    expect(spy.response_format).toEqual({ type: 'json_object' });
  });

  it('incluye system prompt + user message', async () => {
    const { client, spy } = mockClientResponse('{"intent":"other"}');
    await classifyWeightIntent(client, 'quiero bajar de peso');
    expect(spy.messages).toHaveLength(2);
    expect(spy.messages![0].role).toBe('system');
    expect(spy.messages![0].content).toContain('clasificador');
    expect(spy.messages![0].content).toContain('change-weight');
    expect(spy.messages![0].content).toContain('informational');
    expect(spy.messages![0].content).toContain('other');
    expect(spy.messages![1].role).toBe('user');
    expect(spy.messages![1].content).toContain('quiero bajar de peso');
  });

  it('incluye contexto reciente cuando hay turnos previos', async () => {
    const { client, spy } = mockClientResponse('{"intent":"other"}');
    const context: ConversationTurn[] = [
      { role: 'user', content: 'hola' },
      { role: 'assistant', content: '¿en qué te ayudo?' }
    ];
    await classifyWeightIntent(client, 'quiero bajar de peso', context);
    const userBlock = spy.messages![1].content;
    expect(userBlock).toContain('Usuario: hola');
    expect(userBlock).toContain('Bill: ¿en qué te ayudo?');
  });

  it('sin contexto muestra "(sin contexto previo)"', async () => {
    const { client, spy } = mockClientResponse('{"intent":"other"}');
    await classifyWeightIntent(client, 'test');
    const userBlock = spy.messages![1].content;
    expect(userBlock).toContain('(sin contexto previo)');
  });
});

// -------------------- Tests fail-safe --------------------

describe('classifyWeightIntent — fail-safe (derivar cuando falla)', () => {
  it('llamada tira → devuelve change-weight con error', async () => {
    const client = mockClientThrows(new Error('network down'));
    const r = await classifyWeightIntent(client, 'quiero bajar de peso');
    expect(r.intent).toBe('change-weight');
    expect(r.error).toContain('llm-call-failed');
    expect(r.error).toContain('network down');
  });

  it('timeout → devuelve change-weight', async () => {
    const client = mockClientThrows(new Error('Request timed out'));
    const r = await classifyWeightIntent(client, 'test');
    expect(r.intent).toBe('change-weight');
    expect(r.error).toContain('llm-call-failed');
  });

  it('JSON inválido del modelo → devuelve change-weight', async () => {
    const { client } = mockClientResponse('this is not JSON');
    const r = await classifyWeightIntent(client, 'test');
    expect(r.intent).toBe('change-weight');
    expect(r.error).toBe('json-parse-failed');
    expect(r.raw).toBe('this is not JSON');
  });

  it('JSON válido pero intent con valor no permitido → change-weight', async () => {
    const { client } = mockClientResponse('{"intent":"hallucinated"}');
    const r = await classifyWeightIntent(client, 'test');
    expect(r.intent).toBe('change-weight');
    expect(r.error).toBe('invalid-intent-value');
  });

  it('JSON válido sin campo intent → change-weight', async () => {
    const { client } = mockClientResponse('{"category":"informational"}');
    const r = await classifyWeightIntent(client, 'test');
    expect(r.intent).toBe('change-weight');
    expect(r.error).toBe('invalid-intent-value');
  });

  it('response vacía del modelo → change-weight', async () => {
    const { client } = mockClientResponse('');
    const r = await classifyWeightIntent(client, 'test');
    expect(r.intent).toBe('change-weight');
    expect(r.error).toBe('json-parse-failed');
  });
});
