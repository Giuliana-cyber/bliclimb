import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSearchQuery, fetchAndSanitizeChatRag } from './chat-rag-context';

// -------------------- Mock del cliente OpenAI --------------------

type MockClient = {
  vectorStores: {
    search: ReturnType<typeof vi.fn>;
  };
};

function makeClient(searchImpl: () => unknown | Promise<unknown>): MockClient {
  return {
    vectorStores: {
      search: vi.fn(searchImpl)
    }
  };
}

// -------------------- buildSearchQuery --------------------

describe('buildSearchQuery', () => {
  it('toma últimos 3 mensajes concatenados', () => {
    const messages = [
      { role: 'user', content: 'quiero mejorar hangboard' },
      { role: 'assistant', content: '¿qué grado escalas?' },
      { role: 'user', content: '6c, ¿qué protocolo?' }
    ];
    const q = buildSearchQuery(messages);
    expect(q).toContain('quiero mejorar hangboard');
    expect(q).toContain('¿qué grado escalas?');
    expect(q).toContain('6c, ¿qué protocolo?');
  });

  it('con solo 1 mensaje devuelve ese', () => {
    const q = buildSearchQuery([{ role: 'user', content: 'sola pregunta' }]);
    expect(q).toBe('sola pregunta');
  });

  it('trunca a 2000 chars', () => {
    const long = 'x'.repeat(5000);
    const q = buildSearchQuery([{ role: 'user', content: long }]);
    expect(q.length).toBe(2000);
  });

  it('con array vacío → string vacío', () => {
    expect(buildSearchQuery([])).toBe('');
  });
});

// -------------------- fetchAndSanitizeChatRag — happy path --------------------

describe('fetchAndSanitizeChatRag — sanitización y metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chunk con "Fuente:" y "según X" llega sanitizado; sourceNames se preservan', async () => {
    const client = makeClient(() =>
      Promise.resolve({
        data: [
          {
            filename: 'lopez-rivera-2021.pdf',
            content: [
              {
                text:
                  'Los flexores se adaptan con carga isométrica.\n' +
                  'Según el estudio de López-Rivera 2021, el rango óptimo es 60-80%.\n' +
                  'Fuente: Sport Sciences 2019',
                type: 'text'
              }
            ]
          },
          {
            filename: 'horst-training.pdf',
            content: [
              {
                text: 'Recuperación 48h.\n\n## Referencias\n- Hörst 2016',
                type: 'text'
              }
            ]
          }
        ]
      })
    );

    const r = await fetchAndSanitizeChatRag(
      client as never,
      'vs_test',
      'query'
    );

    // Contenido técnico se conserva
    expect(r.context).toContain('Los flexores se adaptan');
    expect(r.context).toContain('rango óptimo es 60-80%');
    expect(r.context).toContain('Recuperación 48h');

    // Atribución removida del texto
    expect(r.context).not.toContain('López-Rivera');
    expect(r.context).not.toContain('Sport Sciences');
    expect(r.context).not.toContain('Hörst 2016');
    expect(r.context).toContain('Según la evidencia');

    // Metadata preservada (fuera del texto)
    expect(r.traceability.usedFileSearch).toBe(true);
    expect(r.traceability.sourceNames).toEqual(
      expect.arrayContaining(['lopez-rivera-2021.pdf', 'horst-training.pdf'])
    );

    // Stats
    expect(r.stats.resultCount).toBe(2);
    expect(r.stats.linesStripped).toBeGreaterThan(0);
    expect(r.stats.sectionsStripped).toBeGreaterThan(0);
    expect(r.stats.phrasesReplaced).toBeGreaterThan(0);
  });

  it('deduplica sourceNames si un archivo aparece en varios chunks', async () => {
    const client = makeClient(() =>
      Promise.resolve({
        data: [
          {
            filename: 'lattice.pdf',
            content: [{ text: 'texto A', type: 'text' }]
          },
          {
            filename: 'lattice.pdf',
            content: [{ text: 'texto B', type: 'text' }]
          }
        ]
      })
    );
    const r = await fetchAndSanitizeChatRag(client as never, 'vs', 'q');
    expect(r.traceability.sourceNames).toEqual(['lattice.pdf']);
  });

  it('pasa max_num_results al SDK (default 5)', async () => {
    const client = makeClient(() => Promise.resolve({ data: [] }));
    await fetchAndSanitizeChatRag(client as never, 'vs', 'q');
    expect(client.vectorStores.search).toHaveBeenCalledWith(
      'vs',
      expect.objectContaining({ max_num_results: 5 })
    );
  });

  it('respeta maxNumResults override', async () => {
    const client = makeClient(() => Promise.resolve({ data: [] }));
    await fetchAndSanitizeChatRag(client as never, 'vs', 'q', {
      maxNumResults: 3
    });
    expect(client.vectorStores.search).toHaveBeenCalledWith(
      'vs',
      expect.objectContaining({ max_num_results: 3 })
    );
  });
});

// -------------------- Casos de fallo --------------------

describe('fetchAndSanitizeChatRag — fail-safe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('search tira error → context vacío, NO propaga', async () => {
    const client = makeClient(() => {
      throw new Error('vector store timeout');
    });
    const r = await fetchAndSanitizeChatRag(client as never, 'vs', 'q');
    expect(r.context).toBe('');
    expect(r.traceability.usedFileSearch).toBe(false);
    expect(r.traceability.sourceNames).toEqual([]);
  });

  it('search Promise rechaza → context vacío', async () => {
    const client = makeClient(() => Promise.reject(new Error('5xx')));
    const r = await fetchAndSanitizeChatRag(client as never, 'vs', 'q');
    expect(r.context).toBe('');
  });

  it('vectorStoreId vacío → skip sin llamar SDK', async () => {
    const client = makeClient(() => Promise.resolve({ data: [] }));
    const r = await fetchAndSanitizeChatRag(client as never, '', 'q');
    expect(client.vectorStores.search).not.toHaveBeenCalled();
    expect(r.context).toBe('');
  });

  it('query vacío → skip sin llamar SDK', async () => {
    const client = makeClient(() => Promise.resolve({ data: [] }));
    const r = await fetchAndSanitizeChatRag(client as never, 'vs', '');
    expect(client.vectorStores.search).not.toHaveBeenCalled();
    expect(r.context).toBe('');
  });

  it('response sin data → context vacío', async () => {
    const client = makeClient(() => Promise.resolve({}));
    const r = await fetchAndSanitizeChatRag(client as never, 'vs', 'q');
    expect(r.context).toBe('');
  });

  it('response con array vacío → context vacío', async () => {
    const client = makeClient(() => Promise.resolve({ data: [] }));
    const r = await fetchAndSanitizeChatRag(client as never, 'vs', 'q');
    expect(r.context).toBe('');
    expect(r.traceability.sourceNames).toEqual([]);
  });
});
