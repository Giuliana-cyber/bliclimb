// Test end-to-end del wiring de §3.15 en chat/route.ts.
//
// Los 4 escenarios que Giuliana pidió:
//   1. no-keyword     → Bill responde normal (stream de la Responses API).
//   2. informational  → Bill responde normal (capa 2 filtra).
//   3. change-weight  → DERIVA (mensaje fijo, Bill NO se llama).
//   4. fail-safe      → capa 2 tira → DERIVA igual (mensaje fijo).
//
// Estrategia: mock del OpenAI SDK completo para controlar tanto la
// llamada del classifier (chat.completions.create) como la del stream de
// Bill (responses.create). Verificamos que las llamadas correctas
// ocurran o NO ocurran según el escenario.

import { describe, expect, it, vi, beforeEach } from 'vitest';

// -------------------- Mocks --------------------
//
// Todos los mocks deben registrarse ANTES de importar el route. Vitest
// hoisting: vi.mock se levanta al top del archivo. Usamos vi.hoisted
// para crear los spies compartidos.

const {
  responsesCreate,
  chatCompletionsCreate,
  gateChatMock,
  checkRateLimitMock,
  commitRateLimitMock,
  buildCoachSystemPromptMock
} = vi.hoisted(() => ({
  responsesCreate: vi.fn(),
  chatCompletionsCreate: vi.fn(),
  gateChatMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  commitRateLimitMock: vi.fn(),
  buildCoachSystemPromptMock: vi.fn(() => 'system prompt de Bill')
}));

vi.mock('openai', () => {
  class OpenAIMock {
    responses = { create: responsesCreate };
    chat = { completions: { create: chatCompletionsCreate } };
    // constructor recibe config pero no lo usa
    constructor(_config?: unknown) {}
  }
  return { default: OpenAIMock };
});

vi.mock('@/lib/billing/gates', () => ({
  gateChat: gateChatMock
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  commitRateLimit: commitRateLimitMock
}));

vi.mock('@/lib/prompts/coach-system', () => ({
  buildCoachSystemPrompt: buildCoachSystemPromptMock
}));

vi.mock('@/lib/ai/response-sources', () => ({
  extractLibraryTraceability: vi.fn(() => ({ sources: [] }))
}));

// Import DESPUÉS de los mocks
const { POST } = await import('./route');

// -------------------- Helpers --------------------

async function readSSEBody(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

function buildRequest(userMessage: string, prevMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []): Request {
  return new Request('http://test/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        ...prevMessages,
        { role: 'user', content: userMessage }
      ],
      profile: { id: 'test-uuid' },
      character: 'bill'
    })
  });
}

// Async iterator para mockear response.output_text.delta events del stream de Bill
async function* mockBillStream(text: string) {
  yield { type: 'response.output_text.delta', delta: text };
  yield {
    type: 'response.completed',
    response: { output: [] }
  };
}

// -------------------- Setup común --------------------

beforeEach(() => {
  vi.clearAllMocks();
  gateChatMock.mockResolvedValue({ allowed: true });
  checkRateLimitMock.mockResolvedValue({ ok: true });
  commitRateLimitMock.mockResolvedValue(undefined);
  responsesCreate.mockImplementation(async () => mockBillStream('Respuesta normal de Bill'));

  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_VECTOR_STORE_ID = 'vs_test';
});

// -------------------- Escenario 1 — no-keyword --------------------

describe('§3.15 e2e — escenario 1: no-keyword → Bill responde normal', () => {
  it('sin keyword de peso, capa 2 NO se llama, Bill sí', async () => {
    const req = buildRequest('quiero mejorar mi técnica de dedos');
    const res = await POST(req);

    // El classifier NO fue invocado
    expect(chatCompletionsCreate).not.toHaveBeenCalled();
    // Bill (Responses API) SÍ fue invocado
    expect(responsesCreate).toHaveBeenCalledOnce();

    const body = await readSSEBody(res);
    expect(body).toContain('Respuesta normal de Bill');
    expect(body).toContain('event: delta');
    expect(body).toContain('event: done');
  });
});

// -------------------- Escenario 2 — informational --------------------

describe('§3.15 e2e — escenario 2: informational → capa 2 filtra, Bill responde normal', () => {
  it('keyword dispara pero classifier dice informational → Bill sí se llama', async () => {
    chatCompletionsCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"intent":"informational"}' } }]
    });

    const req = buildRequest('¿el peso afecta el grado en escalada?');
    const res = await POST(req);

    // Classifier SÍ fue invocado
    expect(chatCompletionsCreate).toHaveBeenCalledOnce();
    // Bill (Responses API) SÍ fue invocado (no se derivó)
    expect(responsesCreate).toHaveBeenCalledOnce();

    const body = await readSSEBody(res);
    expect(body).toContain('Respuesta normal de Bill');
    // NO debe aparecer el mensaje de derivación
    expect(body).not.toContain('Querer escalar más duro');
  });
});

// -------------------- Escenario 3 — change-weight (deriva) --------------------

describe('§3.15 e2e — escenario 3: change-weight → DERIVA, Bill queda en SILENCIO TOTAL', () => {
  it('keyword + intent=change-weight → responde derivación, Bill NO se llama', async () => {
    chatCompletionsCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"intent":"change-weight"}' } }]
    });

    const req = buildRequest('quiero bajar de peso para escalar mejor');
    const res = await POST(req);

    // Classifier SÍ fue invocado
    expect(chatCompletionsCreate).toHaveBeenCalledOnce();
    // Bill NO fue llamado (SILENCIO TOTAL)
    expect(responsesCreate).not.toHaveBeenCalled();

    const body = await readSSEBody(res);
    // Mensaje de derivación en voz Belay Partners
    expect(body).toContain('Querer escalar más duro');
    expect(body).toContain('nutricionista deportivo');
    expect(body).toContain('event: delta');
    expect(body).toContain('event: done');

    // Rate limit consumido
    expect(commitRateLimitMock).toHaveBeenCalledOnce();
  });
});

// -------------------- Escenario 4 — fail-safe --------------------

describe('§3.15 e2e — escenario 4: fail-safe (classifier tira) → DERIVA igual', () => {
  it('capa 2 tira error → deriva por fail-safe, Bill NO se llama', async () => {
    chatCompletionsCreate.mockRejectedValueOnce(new Error('network down'));

    const req = buildRequest('quiero adelgazar 3 kilos');
    const res = await POST(req);

    // Classifier SÍ fue invocado (y falló)
    expect(chatCompletionsCreate).toHaveBeenCalledOnce();
    // Bill NO fue llamado — el fail-safe deriva
    expect(responsesCreate).not.toHaveBeenCalled();

    const body = await readSSEBody(res);
    // Igual se muestra el mensaje de derivación
    expect(body).toContain('Querer escalar más duro');
    expect(body).toContain('event: done');

    expect(commitRateLimitMock).toHaveBeenCalledOnce();
  });

  it('JSON inválido del classifier → deriva por fail-safe', async () => {
    chatCompletionsCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'this is not JSON' } }]
    });

    const req = buildRequest('empecé un ayuno intermitente');
    const res = await POST(req);

    expect(responsesCreate).not.toHaveBeenCalled();
    const body = await readSSEBody(res);
    expect(body).toContain('Querer escalar más duro');
  });
});

// -------------------- Contexto pasado al classifier --------------------

describe('§3.15 e2e — contexto de conversación llega al classifier', () => {
  it('pasa hasta 3 turnos previos como contexto al classifier', async () => {
    chatCompletionsCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"intent":"other"}' } }]
    });

    // Último mensaje sí dispara capa 1 (contiene 'peso' y 'bajar');
    // el contexto de los 3 turnos previos debe llegar a la capa 2 para
    // que pueda desambiguar.
    const req = buildRequest('¿debería bajar de peso entonces?', [
      { role: 'user', content: 'me gusta escalar' },
      { role: 'assistant', content: '¡bien! ¿qué querés mejorar?' },
      { role: 'user', content: 'me preguntan si el peso influye' }
    ]);
    await POST(req);

    // El classifier fue llamado — el contexto debe estar en su user msg
    expect(chatCompletionsCreate).toHaveBeenCalledOnce();
    const args = chatCompletionsCreate.mock.calls[0][0];
    const userBlock = args.messages[1].content;
    expect(userBlock).toContain('Usuario: me gusta escalar');
    expect(userBlock).toContain('Bill: ¡bien! ¿qué querés mejorar?');
  });
});
