import { describe, expect, it } from 'vitest';
import {
  getInjuryDisclaimer,
  hasActiveInjury,
  shouldShowInjuryDisclaimer
} from './injury-disclaimer';

describe('getInjuryDisclaimer', () => {
  it('devuelve copy Bill aprobado literal', () => {
    const msg = getInjuryDisclaimer('bill');
    expect(msg).toBe(
      'Vi que tienes una lesión. Adapté el plan para no cargarla, pero esto lo tiene que ver un profesional — un fisio te va a decir mejor que yo qué puedes y qué no. Si te indica algo distinto, hazle caso a él.'
    );
  });

  it('devuelve copy Senda aprobado literal (variante 2)', () => {
    const msg = getInjuryDisclaimer('senda');
    expect(msg).toBe(
      'Vi que tienes una lesión. Preparé el plan cuidando esa zona, pero esto lo tiene que ver un profesional — un fisio va a leer tu caso mejor que yo. Si te indica algo distinto, hazle caso.'
    );
  });

  it('cero voseo en ambos copies (guardia de sweep Fase 5)', () => {
    // Filtramos solo formas voseo 2da persona. "Adapté / Preparé" son
    // 1ra persona del coach (válidas en tú y voseo, quedan). "Hazle" es
    // imperativo 2da tú (correcto); su voseo sería "hacele".
    for (const character of ['bill', 'senda'] as const) {
      const msg = getInjuryDisclaimer(character);
      expect(msg).not.toMatch(/\b(tenés|hacé|vayá|hablalo|hacele|decile|mirá)\b/i);
      // Palabra clave que confirma voz tú: "tienes" (no "tenés").
      expect(msg).toContain('tienes');
    }
  });
});

describe('hasActiveInjury', () => {
  it('null/undefined/empty → false', () => {
    expect(hasActiveInjury(null)).toBe(false);
    expect(hasActiveInjury(undefined)).toBe(false);
    expect(hasActiveInjury([])).toBe(false);
  });

  it('["none"] → false', () => {
    expect(hasActiveInjury(['none'])).toBe(false);
  });

  it('["returning"] → false (regresando de lesión ≠ lesión activa)', () => {
    expect(hasActiveInjury(['returning'])).toBe(false);
  });

  it('["none", "returning"] → false', () => {
    expect(hasActiveInjury(['none', 'returning'])).toBe(false);
  });

  it.each(['fingers', 'elbows', 'shoulders', 'back', 'knees', 'wrists', 'other'])(
    '["%s"] → true',
    (zone) => {
      expect(hasActiveInjury([zone])).toBe(true);
    }
  );

  it('mix de zonas + none → true (una activa alcanza)', () => {
    expect(hasActiveInjury(['none', 'elbows'])).toBe(true);
  });
});

describe('shouldShowInjuryDisclaimer', () => {
  it('con lesión activa y sin acknowledged → true', () => {
    expect(shouldShowInjuryDisclaimer(['fingers'], null)).toBe(true);
  });

  it('con lesión activa y acknowledged → false', () => {
    expect(
      shouldShowInjuryDisclaimer(['fingers'], '2026-07-08T10:00:00Z')
    ).toBe(false);
  });

  it('sin lesión activa (["none"]) → false aunque acknowledged sea null', () => {
    expect(shouldShowInjuryDisclaimer(['none'], null)).toBe(false);
  });

  it('sin injuries (null) → false', () => {
    expect(shouldShowInjuryDisclaimer(null, null)).toBe(false);
  });

  it('acknowledged con string vacío → equivale a truthy → false', () => {
    // Por seguridad defensiva, cualquier truthy en acknowledgedAt cierra
    // el disclaimer. Un string vacío es falsy en JS pero mejor documentar.
    expect(shouldShowInjuryDisclaimer(['fingers'], '')).toBe(true);
  });
});
