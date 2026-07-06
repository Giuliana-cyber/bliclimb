import { describe, expect, it } from 'vitest';
import { detectHighAttemptCountSignal } from './project-attempts-keywords';

describe('detectHighAttemptCountSignal — triggers positivos', () => {
  it("'llevo 7 intentos' → hit con count=7", () => {
    const r = detectHighAttemptCountSignal('llevo 7 intentos en este proyecto');
    expect(r?.kind).toBe('high-attempt-count');
    expect(r?.numericCount).toBe(7);
  });

  it("'llevo 8 intentos y nada' → hit con count=8", () => {
    const r = detectHighAttemptCountSignal('llevo 8 intentos y nada, no baja');
    expect(r?.numericCount).toBe(8);
  });

  it("'voy por el intento 12' → hit con count=12", () => {
    const r = detectHighAttemptCountSignal('voy por el intento 12 hoy');
    expect(r?.numericCount).toBe(12);
  });

  it("'20 intentos' → hit con count=20", () => {
    const r = detectHighAttemptCountSignal('ya son 20 intentos en total');
    expect(r?.numericCount).toBe(20);
  });

  it("con múltiples números, gana el mayor sobre el umbral", () => {
    const r = detectHighAttemptCountSignal(
      'primer día 3 intentos, segundo día 8 intentos'
    );
    expect(r?.numericCount).toBe(8);
  });

  it("flexión: 'intenté 9 veces' → hit (intente matchea)", () => {
    const r = detectHighAttemptCountSignal('intenté 9 veces la salida');
    expect(r?.kind).toBe('high-attempt-count');
    expect(r?.numericCount).toBe(9);
  });

  it("flexión: 'intentando por decima vez, van 10 intentos' → hit", () => {
    const r = detectHighAttemptCountSignal(
      'sigo intentando, van 10 intentos ya'
    );
    expect(r?.numericCount).toBe(10);
  });
});

describe('detectHighAttemptCountSignal — negativos por umbral', () => {
  it("'6 intentos' → NO (bajo umbral)", () => {
    expect(
      detectHighAttemptCountSignal('llevo 6 intentos, sigo peleandola')
    ).toBeNull();
  });

  it("'3 intentos' → NO", () => {
    expect(detectHighAttemptCountSignal('hice 3 intentos hoy')).toBeNull();
  });

  it("'1 intento' → NO", () => {
    expect(detectHighAttemptCountSignal('fue solo 1 intento')).toBeNull();
  });
});

describe('detectHighAttemptCountSignal — números NO relacionados con intentos', () => {
  it("EDGE — 'descansé 8 minutos' NO dispara (8 lejos de intento)", () => {
    // No hay palabra "intento" en el mensaje → nunca dispara.
    expect(
      detectHighAttemptCountSignal('descansé 8 minutos entre series')
    ).toBeNull();
  });

  it("EDGE — 'hice 20 dominadas' NO dispara (no menciona intento)", () => {
    expect(
      detectHighAttemptCountSignal('hice 20 dominadas en total')
    ).toBeNull();
  });

  it("EDGE — número + 'intento' PERO fuera de la ventana de proximidad", () => {
    // 8 al inicio, "intentos" a 60 caracteres → gap > 25 → NO dispara.
    const msg =
      'descansé 8 minutos entre series y despues hice varias vueltas sin intentos serios';
    expect(detectHighAttemptCountSignal(msg)).toBeNull();
  });

  it("EDGE — '7 series' (no intentos) NO dispara", () => {
    expect(detectHighAttemptCountSignal('hice 7 series de dominadas')).toBeNull();
  });

  it("mensaje sin números → null", () => {
    expect(
      detectHighAttemptCountSignal('llevo muchísimos intentos ya')
    ).toBeNull();
  });

  it("mensaje sin 'intento' → null", () => {
    expect(
      detectHighAttemptCountSignal('llevo 15 sesiones en el proyecto')
    ).toBeNull();
  });
});

describe('detectHighAttemptCountSignal — defensivos', () => {
  it('mensaje vacío → null', () => {
    expect(detectHighAttemptCountSignal('')).toBeNull();
  });

  it('non-string → null', () => {
    expect(
      detectHighAttemptCountSignal(null as unknown as string)
    ).toBeNull();
    expect(
      detectHighAttemptCountSignal(undefined as unknown as string)
    ).toBeNull();
  });

  it('umbral exacto 7 → dispara (>=)', () => {
    const r = detectHighAttemptCountSignal('van 7 intentos');
    expect(r?.numericCount).toBe(7);
  });

  it('numérico grande → dispara y reporta el valor real', () => {
    const r = detectHighAttemptCountSignal('llevo 100 intentos ya, no puedo');
    expect(r?.numericCount).toBe(100);
  });
});
