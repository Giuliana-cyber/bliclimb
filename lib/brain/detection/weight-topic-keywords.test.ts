import { describe, expect, it } from 'vitest';
import {
  detectWeightTopic,
  normalizeForMatch,
  WEIGHT_TOPIC_KEYWORDS
} from './weight-topic-keywords';

describe('normalizeForMatch', () => {
  it('lowercase + strip acentos', () => {
    expect(normalizeForMatch('PESO')).toBe('peso');
    expect(normalizeForMatch('adelgázar')).toBe('adelgazar');
    expect(normalizeForMatch('déficit')).toBe('deficit');
    expect(normalizeForMatch('nutrición')).toBe('nutricion');
  });

  it('colapsa espacios múltiples', () => {
    expect(normalizeForMatch('peso   corporal')).toBe('peso corporal');
    expect(normalizeForMatch('  hola  ')).toBe('hola');
  });

  it('vacío → vacío', () => {
    expect(normalizeForMatch('')).toBe('');
  });
});

describe('detectWeightTopic — happy path (dispara)', () => {
  it.each([
    ['quiero bajar de peso', ['bajar', 'peso']],
    ['cómo hago para adelgazar', ['adelgazar']],
    ['tengo que perder 5 kilos', ['kilos', 'perder']],
    ['estoy en déficit calórico', ['deficit']],
    ['empecé un ayuno intermitente', ['ayuno']],
    ['keto y escalada, ¿funciona?', ['keto']],
    ['¿el peso afecta el grado?', ['peso']],
    ['soy muy pesado para hacer campus', ['pesado']],
    ['tengo mucha grasa abdominal', ['abdominal', 'grasa']],
    ['dieta cetogénica y entrenamiento', ['cetogenica', 'dieta']]
  ])('%s → hit con %j', (msg, expected) => {
    const result = detectWeightTopic(msg);
    expect(result.hit).toBe(true);
    // matched debe INCLUIR las keywords esperadas (puede haber más).
    for (const kw of expected) {
      expect(result.matched).toContain(kw);
    }
  });
});

describe('detectWeightTopic — negación (dispara igual)', () => {
  it('"no quiero bajar de peso" → hit=true (capa 2 lo clasifica)', () => {
    const result = detectWeightTopic('no quiero bajar de peso');
    expect(result.hit).toBe(true);
    expect(result.matched).toContain('peso');
    expect(result.matched).toContain('bajar');
  });

  it('"nunca voy a hacer una dieta restrictiva" → hit=true', () => {
    const result = detectWeightTopic('nunca voy a hacer una dieta restrictiva');
    expect(result.hit).toBe(true);
    expect(result.matched).toContain('dieta');
  });
});

describe('detectWeightTopic — mensajes informativos (dispara, capa 2 filtra)', () => {
  it('"¿el peso afecta el grado?" → hit=true', () => {
    const result = detectWeightTopic('¿el peso afecta el grado?');
    expect(result.hit).toBe(true);
    expect(result.matched).toContain('peso');
  });

  it('"¿cuánto pesan los escaladores élite?" → hit=true (3ra pers plural conjugado)', () => {
    const result = detectWeightTopic('¿cuánto pesan los escaladores élite?');
    expect(result.hit).toBe(true);
    expect(result.matched).toContain('pesan');
  });
});

describe('detectWeightTopic — sin trigger (NO dispara)', () => {
  it.each([
    'quiero mejorar mi técnica',
    'mañana entreno hangboard',
    'me duelen los dedos',
    'cómo hago un dead hang',
    'mi proyecto es 7a',
    'no puedo hacer una dominada'
  ])('%s → hit=false', (msg) => {
    const result = detectWeightTopic(msg);
    expect(result.hit).toBe(false);
    expect(result.matched).toEqual([]);
  });
});

describe('detectWeightTopic — edge cases', () => {
  it('string vacío → no dispara', () => {
    expect(detectWeightTopic('').hit).toBe(false);
    expect(detectWeightTopic('   ').hit).toBe(false);
  });

  it('null/undefined → no dispara (defensive)', () => {
    expect(detectWeightTopic(null as unknown as string).hit).toBe(false);
    expect(detectWeightTopic(undefined as unknown as string).hit).toBe(false);
  });

  it('word boundary: "reposo" NO matchea "peso"', () => {
    // 'peso' está dentro de 'reposo' pero como no hay word boundary, no matchea
    const result = detectWeightTopic('necesito más reposo entre series');
    expect(result.matched).not.toContain('peso');
  });

  it('word boundary: "cardio" NO matchea "cardi..." falso positivo', () => {
    // 'cardio' no está en la lista, no debería aparecer.
    const result = detectWeightTopic('hago cardio para calentar');
    expect(result.matched).toEqual([]);
  });

  it('multi-match: mensaje con muchas keywords', () => {
    const result = detectWeightTopic('quiero bajar peso con dieta keto y déficit');
    expect(result.hit).toBe(true);
    expect(result.matched.length).toBeGreaterThanOrEqual(4);
    expect(result.matched).toContain('bajar');
    expect(result.matched).toContain('peso');
    expect(result.matched).toContain('dieta');
    expect(result.matched).toContain('keto');
    expect(result.matched).toContain('deficit');
  });

  it('matched viene ordenada alfabéticamente y dedupeada', () => {
    const result = detectWeightTopic('peso peso PESO adelgazar');
    // 'peso' aparece 3 veces en el input pero solo 1 en matched
    const pesoCount = result.matched.filter((m) => m === 'peso').length;
    expect(pesoCount).toBe(1);
    // Orden alfabético
    expect(result.matched).toEqual([...result.matched].sort());
  });

  it('tildes: "déficit" y "deficit" ambos matchean la keyword "deficit"', () => {
    expect(detectWeightTopic('estoy en déficit').matched).toContain('deficit');
    expect(detectWeightTopic('estoy en deficit').matched).toContain('deficit');
  });
});

describe('WEIGHT_TOPIC_KEYWORDS — sanity de la lista', () => {
  it('todas las keywords son lowercase sin tildes', () => {
    for (const kw of WEIGHT_TOPIC_KEYWORDS) {
      expect(kw).toBe(normalizeForMatch(kw));
    }
  });

  it('no hay duplicados', () => {
    const uniq = new Set(WEIGHT_TOPIC_KEYWORDS);
    expect(uniq.size).toBe(WEIGHT_TOPIC_KEYWORDS.length);
  });

  it('no hay strings vacíos', () => {
    for (const kw of WEIGHT_TOPIC_KEYWORDS) {
      expect(kw.length).toBeGreaterThan(0);
    }
  });
});
