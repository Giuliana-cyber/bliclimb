import { describe, expect, it } from 'vitest';
import { checkChatHints } from './chat-hints';

describe('checkChatHints — §10.3 sickness', () => {
  it('mild (resfriado) → 1 hint con instrucción REDUCIR volumen', () => {
    const r = checkChatHints('estoy resfriado, entreno igual hoy?');
    expect(r.hints).toHaveLength(1);
    expect(r.hints[0]).toContain('§10.3');
    expect(r.hints[0]).toContain('REDUCIR');
    expect(r.hints[0].toLowerCase()).toContain('resfriado');
    expect(r.logEvents).toHaveLength(1);
    if (r.logEvents[0].kind === 'chat-hint-injected' && r.logEvents[0].rule === '10.3') {
      expect(r.logEvents[0].severity).toBe('mild-symptoms');
      expect(r.logEvents[0].matched).toContain('resfriado');
    }
  });

  it('high (fiebre) → 1 hint con DESCANSO TOTAL', () => {
    const r = checkChatHints('tengo fiebre desde ayer');
    expect(r.hints).toHaveLength(1);
    expect(r.hints[0]).toContain('DESCANSO TOTAL');
    expect(r.logEvents[0].kind).toBe('chat-hint-injected');
    if (r.logEvents[0].kind === 'chat-hint-injected' && r.logEvents[0].rule === '10.3') {
      expect(r.logEvents[0].severity).toBe('high-symptoms');
    }
  });

  it('temp 38° → high', () => {
    const r = checkChatHints('me tomé la temperatura y tengo 38.5 grados');
    expect(r.hints[0]).toContain('DESCANSO TOTAL');
  });
});

describe('checkChatHints — §10.4 attempts', () => {
  it('"llevo 7 intentos" → 1 hint con parar por hoy', () => {
    const r = checkChatHints('llevo 7 intentos en el proyecto y no me sale');
    expect(r.hints).toHaveLength(1);
    expect(r.hints[0]).toContain('§10.4');
    expect(r.hints[0]).toContain('PARAR POR HOY');
    expect(r.hints[0]).toContain('7');
    if (r.logEvents[0].kind === 'chat-hint-injected' && r.logEvents[0].rule === '10.4') {
      expect(r.logEvents[0].numericCount).toBe(7);
    }
  });

  it('"6 intentos" → NO hint (bajo umbral)', () => {
    const r = checkChatHints('llevo 6 intentos');
    expect(r.hints).toHaveLength(0);
    expect(r.logEvents).toHaveLength(0);
  });

  it('"descansé 8 minutos" → NO hint (no menciona intento)', () => {
    const r = checkChatHints('descansé 8 minutos entre series');
    expect(r.hints).toHaveLength(0);
  });
});

describe('checkChatHints — combinación', () => {
  it('sickness + attempts en el mismo mensaje → 2 hints, orden 10.3 primero', () => {
    const r = checkChatHints(
      'estoy resfriado y aparte llevo 8 intentos en el proyecto'
    );
    expect(r.hints).toHaveLength(2);
    expect(r.hints[0]).toContain('§10.3');
    expect(r.hints[1]).toContain('§10.4');
    expect(r.logEvents).toHaveLength(2);
  });
});

describe('checkChatHints — negativos', () => {
  it('mensaje sin señales → hints vacíos, logEvents vacíos', () => {
    const r = checkChatHints('quiero mejorar mi hangboard esta semana');
    expect(r.hints).toHaveLength(0);
    expect(r.logEvents).toHaveLength(0);
  });

  it('mensaje vacío / null / undefined → vacíos (defensivo)', () => {
    expect(checkChatHints('').hints).toHaveLength(0);
    expect(checkChatHints(null as unknown as string).hints).toHaveLength(0);
    expect(checkChatHints(undefined as unknown as string).hints).toHaveLength(0);
  });
});
