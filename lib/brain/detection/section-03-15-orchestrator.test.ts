import { describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { checkWeightDerivation } from './section-03-15-orchestrator';

function mockClient(body: string): OpenAI {
  const create = vi.fn(async () => ({
    choices: [{ message: { content: body } }]
  }));
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

function mockClientThrows(err: Error): OpenAI {
  const create = vi.fn(async () => {
    throw err;
  });
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

function mockClientNeverCalled(): OpenAI {
  const create = vi.fn(async () => {
    throw new Error('LLM should NOT have been called');
  });
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

describe('checkWeightDerivation — sin trigger de capa 1', () => {
  it('mensaje sin keywords → NO llama a la capa 2, devuelve no-keyword', async () => {
    const client = mockClientNeverCalled();
    const r = await checkWeightDerivation(client, 'quiero mejorar mi técnica');
    expect(r.derive).toBe(false);
    if (!r.derive) {
      expect(r.reason).toBe('no-keyword');
      expect(r.layer1.hit).toBe(false);
      expect(r.layer1.matched).toEqual([]);
    }
  });

  it('mensaje vacío → no-keyword', async () => {
    const client = mockClientNeverCalled();
    const r = await checkWeightDerivation(client, '');
    expect(r.derive).toBe(false);
    if (!r.derive) expect(r.reason).toBe('no-keyword');
  });
});

describe("checkWeightDerivation — capa 2 = 'change-weight' → derivar", () => {
  it('intención clara → derive true con reason=change-weight', async () => {
    const client = mockClient('{"intent":"change-weight"}');
    const r = await checkWeightDerivation(client, 'quiero bajar de peso');
    expect(r.derive).toBe(true);
    if (r.derive) {
      expect(r.reason).toBe('change-weight');
      expect(r.layer1.hit).toBe(true);
      expect(r.layer1.matched).toContain('peso');
      expect(r.layer1.matched).toContain('bajar');
      expect(r.layer2.intent).toBe('change-weight');
    }
  });
});

describe("checkWeightDerivation — capa 2 = 'informational' → NO derivar", () => {
  it('pregunta informativa → derive false con reason=informational', async () => {
    const client = mockClient('{"intent":"informational"}');
    const r = await checkWeightDerivation(client, '¿el peso afecta el grado?');
    expect(r.derive).toBe(false);
    if (!r.derive) {
      expect(r.reason).toBe('informational');
      expect(r.layer1.hit).toBe(true);
    }
  });
});

describe("checkWeightDerivation — capa 2 = 'other' → NO derivar (caso negación)", () => {
  it('"no quiero bajar de peso" → NO deriva (negación clasificada como other)', async () => {
    const client = mockClient('{"intent":"other"}');
    const r = await checkWeightDerivation(client, 'no quiero bajar de peso');
    expect(r.derive).toBe(false);
    if (!r.derive) {
      expect(r.reason).toBe('other');
      // Layer 1 SÍ disparó (contiene 'peso', 'bajar')
      expect(r.layer1.hit).toBe(true);
      expect(r.layer1.matched).toContain('peso');
    }
  });
});

describe('checkWeightDerivation — fail-safe (capa 2 falla → derivar)', () => {
  it('llamada LLM tira → derive=true con reason=fail-safe', async () => {
    const client = mockClientThrows(new Error('network down'));
    const r = await checkWeightDerivation(client, 'quiero bajar de peso');
    expect(r.derive).toBe(true);
    if (r.derive) {
      expect(r.reason).toBe('fail-safe');
      expect(r.layer2.error).toContain('llm-call-failed');
      expect(r.layer2.intent).toBe('change-weight'); // el classifier fail-safe siempre da change-weight
    }
  });

  it('JSON inválido del modelo → fail-safe', async () => {
    const client = mockClient('not json');
    const r = await checkWeightDerivation(client, 'quiero bajar de peso');
    expect(r.derive).toBe(true);
    if (r.derive) {
      expect(r.reason).toBe('fail-safe');
      expect(r.layer2.error).toBe('json-parse-failed');
    }
  });

  it('modelo devuelve intent inválido → fail-safe', async () => {
    const client = mockClient('{"intent":"hallucinated-category"}');
    const r = await checkWeightDerivation(client, 'quiero bajar de peso');
    expect(r.derive).toBe(true);
    if (r.derive) {
      expect(r.reason).toBe('fail-safe');
      expect(r.layer2.error).toBe('invalid-intent-value');
    }
  });
});

describe('checkWeightDerivation — pasa contexto a capa 2', () => {
  it('los turnos previos llegan a la llamada del modelo', async () => {
    let receivedMessages: unknown = null;
    const create = vi.fn(async (args: { messages: unknown }) => {
      receivedMessages = args.messages;
      return {
        choices: [{ message: { content: '{"intent":"change-weight"}' } }]
      };
    });
    const client = {
      chat: { completions: { create } }
    } as unknown as OpenAI;

    await checkWeightDerivation(client, 'quiero bajar', [
      { role: 'user', content: 'hola' },
      { role: 'assistant', content: '¿en qué te ayudo?' }
    ]);

    const msgs = receivedMessages as Array<{ content: string }>;
    expect(msgs[1].content).toContain('Usuario: hola');
    expect(msgs[1].content).toContain('Bill: ¿en qué te ayudo?');
  });
});

describe('checkWeightDerivation — casos frontera de Giuliana (test explícito)', () => {
  it('"no quiero bajar de peso" — capa 1 dispara Y capa 2 filtra correctamente (other)', async () => {
    // Simula lo que gpt-4o-mini debería hacer con negación.
    const client = mockClient('{"intent":"other"}');
    const r = await checkWeightDerivation(client, 'no quiero bajar de peso');
    expect(r.derive).toBe(false);
    if (!r.derive) {
      // Capa 1 SÍ debe disparar (tiene keywords)
      expect(r.layer1.hit).toBe(true);
      // Capa 2 clasifica bien (other/informational, NO change-weight)
      expect(r.reason).not.toBe('change-weight');
    }
  });

  it('"¿el peso afecta el grado?" — capa 1 dispara Y capa 2 dice informational (NO deriva)', async () => {
    const client = mockClient('{"intent":"informational"}');
    const r = await checkWeightDerivation(client, '¿el peso afecta el grado?');
    expect(r.derive).toBe(false);
    if (!r.derive) {
      expect(r.layer1.hit).toBe(true);
      expect(r.reason).toBe('informational');
    }
  });
});
