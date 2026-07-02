import { describe, expect, it } from 'vitest';
import {
  CSV_HEADER,
  csvRowToExerciseRow,
  emptyToNull,
  KNOWN_ESTADO_VALUES,
  KNOWN_TYPO_FIXES,
  normalizeEstado,
  parseTagsList,
  requireNonEmpty,
  type CsvRow
} from './csv-normalize';

describe('parseTagsList', () => {
  it('vacío → []', () => {
    expect(parseTagsList('')).toEqual([]);
    expect(parseTagsList('   ')).toEqual([]);
  });

  it('single tag: trim + lowercase', () => {
    expect(parseTagsList('Boulder')).toEqual(['boulder']);
    expect(parseTagsList(' Boulder ')).toEqual(['boulder']);
    expect(parseTagsList('BOULDER')).toEqual(['boulder']);
  });

  it('multi tag: split por coma + trim + lowercase', () => {
    expect(parseTagsList('hangboard, dead-hang, flexores dedos')).toEqual([
      'hangboard',
      'dead-hang',
      'flexores dedos'
    ]);
  });

  it('normaliza variantes de casing en el mismo string', () => {
    expect(parseTagsList('Boulder,boulder, BOULDER ')).toEqual([
      'boulder',
      'boulder',
      'boulder'
    ]);
  });

  it('filtra tags vacíos entre comas ("a,,b")', () => {
    expect(parseTagsList('MaxHangs,, MED , ')).toEqual(['maxhangs', 'med']);
  });

  it('colapsa espacios internos múltiples', () => {
    expect(parseTagsList('open  crimp,%BW, riesgo   alto')).toEqual([
      'open crimp',
      '%bw',
      'riesgo alto'
    ]);
  });
});

describe('normalizeEstado — typo fix conocido', () => {
  it('"Pendiente deduplicacion" (sin tilde) → "Pendiente deduplicación", wasFixed=true', () => {
    const res = normalizeEstado('Pendiente deduplicacion');
    expect(res.value).toBe('Pendiente deduplicación');
    expect(res.wasFixed).toBe(true);
  });

  it('"Pendiente deduplicación" (con tilde, correcto) → unchanged, wasFixed=false', () => {
    const res = normalizeEstado('Pendiente deduplicación');
    expect(res.value).toBe('Pendiente deduplicación');
    expect(res.wasFixed).toBe(false);
  });

  it('"activo" → unchanged, wasFixed=false', () => {
    const res = normalizeEstado('activo');
    expect(res.value).toBe('activo');
    expect(res.wasFixed).toBe(false);
  });

  it('trim de espacios alrededor', () => {
    const res = normalizeEstado('  Pendiente limpieza  ');
    expect(res.value).toBe('Pendiente limpieza');
    expect(res.wasFixed).toBe(false);
  });

  it('KNOWN_TYPO_FIXES.estado documenta el fix', () => {
    expect(KNOWN_TYPO_FIXES.estado).toEqual({
      'Pendiente deduplicacion': 'Pendiente deduplicación'
    });
  });
});

describe('emptyToNull', () => {
  it('"" → null', () => {
    expect(emptyToNull('')).toBeNull();
    expect(emptyToNull('   ')).toBeNull();
  });

  it('undefined → null', () => {
    expect(emptyToNull(undefined)).toBeNull();
  });

  it('null → null', () => {
    expect(emptyToNull(null as unknown as string)).toBeNull();
  });

  it('string con contenido → trim', () => {
    expect(emptyToNull('  hola ')).toBe('hola');
    expect(emptyToNull('hola')).toBe('hola');
  });
});

describe('requireNonEmpty', () => {
  it('devuelve trim si tiene contenido', () => {
    expect(requireNonEmpty(' Boulder ', 'X', 'ID-1')).toBe('Boulder');
  });

  it('tira si viene vacío', () => {
    expect(() => requireNonEmpty('', 'Nombre', 'ID-1')).toThrow(
      /'Nombre' vacío/
    );
    expect(() => requireNonEmpty('   ', 'Nombre', 'ID-1')).toThrow(
      /'Nombre' vacío/
    );
  });

  it('tira con id incluido para debug', () => {
    expect(() => requireNonEmpty('', 'Nombre', 'FD-042')).toThrow(/FD-042/);
  });
});

describe('KNOWN_ESTADO_VALUES — allowlist post-normalización', () => {
  it('el canónico "Pendiente deduplicación" (con tilde) está', () => {
    expect(KNOWN_ESTADO_VALUES.has('Pendiente deduplicación')).toBe(true);
  });

  it('el typo "Pendiente deduplicacion" (sin tilde) NO está — se colapsa vía normalizeEstado', () => {
    expect(KNOWN_ESTADO_VALUES.has('Pendiente deduplicacion')).toBe(false);
  });

  it('los 12 valores canónicos del snapshot v3 (post-fix FIL-004) están', () => {
    expect(KNOWN_ESTADO_VALUES.size).toBe(12);
  });

  it('"Sí con bloqueo por perfil" NO está — pertenece a Publicable app, fix aplicado en FIL-004', () => {
    expect(KNOWN_ESTADO_VALUES.has('Sí con bloqueo por perfil')).toBe(false);
  });

  it('cualquier valor no anticipado devuelve false', () => {
    expect(KNOWN_ESTADO_VALUES.has('Estado inventado 2027')).toBe(false);
    expect(KNOWN_ESTADO_VALUES.has('')).toBe(false);
  });
});

describe('CSV_HEADER — contrato de columnas', () => {
  it('tiene exactamente 31 columnas', () => {
    expect(CSV_HEADER.length).toBe(31);
  });

  it('primera columna es ID', () => {
    expect(CSV_HEADER[0]).toBe('ID');
  });

  it('última columna es Notas', () => {
    expect(CSV_HEADER[30]).toBe('Notas');
  });
});

// ---------- Test integrador: fila completa ----------

const SAMPLE_ROW: CsvRow = {
  ID: 'FD-001',
  Nombre: 'Dead-hang básico en hangboard',
  Tipo: 'Ejercicio',
  Categoría: 'Fuerza de dedos',
  Subcategoría: '',
  Objetivo: 'Ganar fuerza específica de agarre',
  Nivel: 'Intermedio en adelante',
  'Tipo escalador': 'General',
  Equipo: 'Hangboard con regletas cómodas',
  Descripción: 'Cuelga controlada del hangboard con brazos activos.',
  Series: '3-5',
  Reps: '',
  Tiempo: '10 seg',
  TUT: '',
  Descanso: '3 min',
  Intensidad: 'Alta si se usa regleta pequeña',
  Frecuencia: '2x/sem',
  Progresión: 'Añadir peso cuando aguantes 12 seg limpios',
  Regresión: 'Regleta más profunda',
  'Errores comunes': 'Hombros arriba, codos bloqueados',
  Precauciones: 'No con dolor de dedos',
  'Señales detener': 'Dolor punzante en las poleas',
  Riesgo: 'Medio/alto',
  Tags: 'Hangboard, dead-hang,  flexores  dedos ,,riesgo medio-alto',
  'Fuente primaria': 'Hörst (How to Climb 5.12)',
  'Fuente secundaria': '',
  'URL fuente': '',
  Estado: 'Pendiente deduplicacion',
  'Publicable app': 'Sí con advertencia',
  'Validación profesional': 'No requerida',
  Notas: ''
};

describe('csvRowToExerciseRow — end-to-end', () => {
  it('mapea camelCase español → snake_case DB con normalizaciones', () => {
    const { exercise, fixesApplied } = csvRowToExerciseRow(SAMPLE_ROW);

    expect(exercise.id).toBe('FD-001');
    expect(exercise.nombre).toBe('Dead-hang básico en hangboard');
    expect(exercise.tipo).toBe('Ejercicio');
    expect(exercise.categoria).toBe('Fuerza de dedos');

    // Nullable colapsados a null
    expect(exercise.subcategoria).toBeNull();
    expect(exercise.reps).toBeNull();
    expect(exercise.tut).toBeNull();
    expect(exercise.fuente_secundaria).toBeNull();
    expect(exercise.url_fuente).toBeNull();
    expect(exercise.notas).toBeNull();

    // Tags parseados + lowercase + filtrados
    expect(exercise.tags).toEqual([
      'hangboard',
      'dead-hang',
      'flexores dedos',
      'riesgo medio-alto'
    ]);

    // Estado con fix aplicado
    expect(exercise.estado).toBe('Pendiente deduplicación');
    expect(fixesApplied.estadoTypo).toBe(true);

    // Preservados
    expect(exercise.publicable_app).toBe('Sí con advertencia');
    expect(exercise.riesgo).toBe('Medio/alto');
  });

  it('tira si un NOT NULL viene vacío', () => {
    const bad = { ...SAMPLE_ROW, Nombre: '' } as CsvRow;
    expect(() => csvRowToExerciseRow(bad)).toThrow(/'Nombre' vacío/);
  });

  it('fixesApplied.estadoTypo=false cuando estado ya es canónico', () => {
    const good = { ...SAMPLE_ROW, Estado: 'activo' } as CsvRow;
    const { fixesApplied } = csvRowToExerciseRow(good);
    expect(fixesApplied.estadoTypo).toBe(false);
  });
});
