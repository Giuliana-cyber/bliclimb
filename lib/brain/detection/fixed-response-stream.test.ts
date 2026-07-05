import { describe, expect, it } from 'vitest';
import { buildFixedResponseStream } from './fixed-response-stream';

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
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

describe('buildFixedResponseStream — shape SSE idéntico al chat streaming', () => {
  it('emite delta con el texto completo + done', async () => {
    const stream = buildFixedResponseStream('Hola mundo');
    const text = await readAll(stream);

    // Debe contener un evento delta con el texto y un evento done.
    expect(text).toContain('event: delta');
    expect(text).toContain('"text":"Hola mundo"');
    expect(text).toContain('event: done');
  });

  it('done payload default es {}', async () => {
    const stream = buildFixedResponseStream('x');
    const text = await readAll(stream);
    expect(text).toContain('event: done\ndata: {}');
  });

  it('done payload custom se serializa', async () => {
    const stream = buildFixedResponseStream('x', {
      source: 'derivation',
      rule: '3.15'
    });
    const text = await readAll(stream);
    expect(text).toContain('"source":"derivation"');
    expect(text).toContain('"rule":"3.15"');
  });

  it('escapa correctamente mensajes con newlines / comillas', async () => {
    const stream = buildFixedResponseStream(
      'Línea uno\nLínea "dos"'
    );
    const text = await readAll(stream);
    // JSON escape: \n → \\n, " → \"
    expect(text).toContain('\\n');
    expect(text).toContain('\\"');
  });

  it('mensaje vacío → aún emite delta + done', async () => {
    const stream = buildFixedResponseStream('');
    const text = await readAll(stream);
    expect(text).toContain('"text":""');
    expect(text).toContain('event: done');
  });

  it('cierra el stream tras el done (no queda abierto)', async () => {
    const stream = buildFixedResponseStream('x');
    const reader = stream.getReader();
    // Leer todo
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
    // Segundo read debe indicar done inmediatamente
    const { done } = await reader.read();
    expect(done).toBe(true);
  });
});
