import { describe, expect, it } from 'vitest';
import { detectSicknessSignal } from './sickness-keywords';

describe('detectSicknessSignal — high symptoms (descanso total)', () => {
  it("'tengo fiebre' → high", () => {
    const r = detectSicknessSignal('tengo fiebre y me siento mal');
    expect(r?.kind).toBe('high-symptoms');
    expect(r?.matched).toContain('fiebre');
  });

  it("'me agarró covid' → high", () => {
    const r = detectSicknessSignal('me agarró covid la semana pasada');
    expect(r?.kind).toBe('high-symptoms');
    expect(r?.matched).toContain('covid');
  });

  it("'con escalofríos' → high (normaliza tilde)", () => {
    const r = detectSicknessSignal('estoy con escalofríos desde ayer');
    expect(r?.kind).toBe('high-symptoms');
    expect(r?.matched).toContain('escalofrios');
  });

  it("'38 grados' → high por regex de temperatura", () => {
    const r = detectSicknessSignal('tengo 38 grados desde anoche');
    expect(r?.kind).toBe('high-symptoms');
  });

  it("'39.2°C' → high", () => {
    const r = detectSicknessSignal('el termómetro marcó 39.2°C');
    expect(r?.kind).toBe('high-symptoms');
  });

  it("'37 grados' NO dispara (no es fiebre clínica)", () => {
    const r = detectSicknessSignal('tengo 37 grados, medio raro');
    // 37 no matchea el regex de 38+; pero tampoco hay keyword → null
    expect(r).toBeNull();
  });

  it('high gana sobre mild cuando coexisten', () => {
    const r = detectSicknessSignal('me resfrié y ahora tengo fiebre');
    expect(r?.kind).toBe('high-symptoms');
    // matched debe incluir solo los del nivel high
    expect(r?.matched).toContain('fiebre');
    expect(r?.matched).not.toContain('resfriado');
  });
});

describe('detectSicknessSignal — mild symptoms (reducir volumen)', () => {
  it("'estoy resfriado' → mild", () => {
    const r = detectSicknessSignal('estoy resfriado hace 2 días');
    expect(r?.kind).toBe('mild-symptoms');
    expect(r?.matched).toContain('resfriado');
  });

  it("'me estoy resfriando' → mild (variante flexionada)", () => {
    // 'resfriándome' con tilde → 'resfriandome' → matchea el keyword
    const r = detectSicknessSignal('me estoy resfriándome, entreno igual?');
    expect(r?.kind).toBe('mild-symptoms');
    expect(r?.matched).toContain('resfriandome');
  });

  it("'tengo gripe' → mild", () => {
    const r = detectSicknessSignal('tengo gripe y no sé si ir al gym');
    expect(r?.kind).toBe('mild-symptoms');
    expect(r?.matched).toContain('gripe');
  });

  it("'engripado' → mild", () => {
    const r = detectSicknessSignal('estoy medio engripado desde el finde');
    expect(r?.kind).toBe('mild-symptoms');
    expect(r?.matched).toContain('engripado');
  });

  it("'con mucha tos y mocos' → mild (ambos matchean)", () => {
    const r = detectSicknessSignal('estoy con mucha tos y mocos');
    expect(r?.kind).toBe('mild-symptoms');
    expect(r?.matched).toContain('tos');
    expect(r?.matched).toContain('mocos');
  });

  it("'garganta' → mild", () => {
    const r = detectSicknessSignal('me arde la garganta desde anoche');
    expect(r?.kind).toBe('mild-symptoms');
    expect(r?.matched).toContain('garganta');
  });

  it('matched dedupe + ordenado alfabético', () => {
    const r = detectSicknessSignal('tos, tos y más tos');
    expect(r?.matched).toEqual(['tos']);
  });
});

describe('detectSicknessSignal — negativos', () => {
  it('mensaje sin síntomas → null', () => {
    expect(
      detectSicknessSignal('quiero mejorar mi hangboard esta semana')
    ).toBeNull();
  });

  it('mensaje vacío → null', () => {
    expect(detectSicknessSignal('')).toBeNull();
  });

  it('non-string → null (defensivo)', () => {
    expect(detectSicknessSignal(null as unknown as string)).toBeNull();
    expect(detectSicknessSignal(undefined as unknown as string)).toBeNull();
    expect(detectSicknessSignal(42 as unknown as string)).toBeNull();
  });

  it("substring dentro de otra palabra NO dispara (word boundary)", () => {
    // "tosco" contiene "tos" pero es otra palabra → NO debe matchear.
    expect(detectSicknessSignal('el movimiento fue tosco pero salió')).toBeNull();
  });

  it("'gripar el motor' NO dispara — gripar no está en el vocabulario", () => {
    // Contraste con 'gripe'/'engripado' que sí. 'gripar' sin flexión
    // médica no está en la lista, y "gripe" tiene word boundary.
    expect(detectSicknessSignal('vas a gripar el motor asi')).toBeNull();
  });
});
