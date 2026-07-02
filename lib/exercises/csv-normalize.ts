// Normalización del CSV `data/brain/exercises-v3.csv` antes de escribir
// a la tabla `public.exercises`.
//
// Funciones puras — sin IO — para poder testearlas sin DB.

/**
 * Header exacto que esperamos en el CSV. Si el CSV cambia de columnas
 * el seeder tira antes de escribir.
 */
export const CSV_HEADER = [
  'ID',
  'Nombre',
  'Tipo',
  'Categoría',
  'Subcategoría',
  'Objetivo',
  'Nivel',
  'Tipo escalador',
  'Equipo',
  'Descripción',
  'Series',
  'Reps',
  'Tiempo',
  'TUT',
  'Descanso',
  'Intensidad',
  'Frecuencia',
  'Progresión',
  'Regresión',
  'Errores comunes',
  'Precauciones',
  'Señales detener',
  'Riesgo',
  'Tags',
  'Fuente primaria',
  'Fuente secundaria',
  'URL fuente',
  'Estado',
  'Publicable app',
  'Validación profesional',
  'Notas'
] as const;

export type CsvRow = Record<(typeof CSV_HEADER)[number], string>;

/**
 * Row que insertamos en `public.exercises`. Columnas coinciden con el
 * schema de 0010_exercises_schema.sql (snake_case).
 */
export type ExerciseRow = {
  id: string;
  nombre: string;
  tipo: string;
  categoria: string;
  subcategoria: string | null;
  objetivo: string | null;
  nivel: string | null;
  tipo_escalador: string | null;
  equipo: string;
  descripcion: string;
  series: string | null;
  reps: string | null;
  tiempo: string | null;
  tut: string | null;
  descanso: string | null;
  intensidad: string | null;
  frecuencia: string | null;
  progresion: string | null;
  regresion: string | null;
  errores_comunes: string | null;
  precauciones: string | null;
  senales_detener: string | null;
  riesgo: string;
  tags: string[];
  fuente_primaria: string;
  fuente_secundaria: string | null;
  url_fuente: string | null;
  estado: string;
  publicable_app: string;
  validacion_profesional: string | null;
  notas: string | null;
};

/**
 * Parsea el string de tags de una fila:
 *   - Split por coma
 *   - Trim de cada tag
 *   - Lowercase
 *   - Filter vacíos y colapsa espacios internos
 *
 * Motivación: los tags en el CSV tienen variantes de casing/whitespace
 * ("Boulder", " boulder ", "BOULDER"). Normalizando al escribir, las
 * queries posteriores nunca fallan por casing.
 */
export function parseTagsList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter((tag) => tag.length > 0);
}

/**
 * Fixes conocidos que aplicamos al leer del CSV. Cada uno tiene una
 * razón documentada — no hacer normalización silenciosa.
 */
export const KNOWN_TYPO_FIXES = {
  estado: {
    // Descubierto durante el análisis del CSV (Fase 1). 5 filas en
    // v3 tienen "Pendiente deduplicacion" sin tilde; el valor
    // canónico es "Pendiente deduplicación". Fix silencioso al escribir.
    'Pendiente deduplicacion': 'Pendiente deduplicación'
  }
} as const;

/**
 * Aplica el fix de typo conocido a `Estado`. Devuelve `{ value, wasFixed }`
 * para que el seeder pueda contar cuántas filas se corrigieron y loggear.
 */
export function normalizeEstado(raw: string): { value: string; wasFixed: boolean } {
  const trimmed = raw.trim();
  const fix = (KNOWN_TYPO_FIXES.estado as Record<string, string>)[trimmed];
  if (fix) {
    return { value: fix, wasFixed: true };
  }
  return { value: trimmed, wasFixed: false };
}

/**
 * Allowlist de valores canónicos de `Estado` **post-normalización**. Extraído
 * del snapshot exercises-v3.csv (Fase 1) tras el fix de FIL-004. El seeder
 * falla si aparece cualquier valor fuera de este set — así una nueva variante
 * de curación no entra a la DB silenciosamente.
 */
export const KNOWN_ESTADO_VALUES = new Set<string>([
  'activo',
  'Faltante',
  'Incompleto',
  'Pendiente deduplicación',
  'Pendiente limpieza',
  'Pendiente migrar a Contenido app',
  'Pendiente migrar a Motor',
  'Pendiente migrar a Seguridad',
  'Pendiente migrar a Seguridad/Motor',
  'Pendiente revisión legal',
  'EXCLUIDO v1 (HIT diferido a v2)',
  'EXCLUIDO v1 (decisión de producto: HIT diferido a v2)'
]);

/**
 * Colapsa strings vacíos ("") a `null` para columnas nullable. Preserva
 * strings con contenido tal cual (con trim).
 */
export function emptyToNull(raw: string | undefined): string | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Requiere que una columna NOT NULL tenga contenido. Si viene vacía tira
 * — el seeder no debería silenciar problemas de data.
 */
export function requireNonEmpty(raw: string | undefined, fieldName: string, id: string): string {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') {
    throw new Error(
      `[csv-normalize] Fila ${id}: campo obligatorio '${fieldName}' vacío. Revisar CSV origen.`
    );
  }
  return trimmed;
}

/**
 * Convierte una fila del CSV al shape de fila de DB. Aplica todos los
 * normalizadores.
 */
export function csvRowToExerciseRow(row: CsvRow): {
  exercise: ExerciseRow;
  fixesApplied: { estadoTypo: boolean };
} {
  const id = requireNonEmpty(row.ID, 'ID', row.ID ?? '(sin id)');
  const estadoNorm = normalizeEstado(row.Estado);
  return {
    exercise: {
      id,
      nombre: requireNonEmpty(row.Nombre, 'Nombre', id),
      tipo: requireNonEmpty(row.Tipo, 'Tipo', id),
      categoria: requireNonEmpty(row.Categoría, 'Categoría', id),
      subcategoria: emptyToNull(row.Subcategoría),
      objetivo: emptyToNull(row.Objetivo),
      nivel: emptyToNull(row.Nivel),
      tipo_escalador: emptyToNull(row['Tipo escalador']),
      equipo: requireNonEmpty(row.Equipo, 'Equipo', id),
      descripcion: requireNonEmpty(row.Descripción, 'Descripción', id),
      series: emptyToNull(row.Series),
      reps: emptyToNull(row.Reps),
      tiempo: emptyToNull(row.Tiempo),
      tut: emptyToNull(row.TUT),
      descanso: emptyToNull(row.Descanso),
      intensidad: emptyToNull(row.Intensidad),
      frecuencia: emptyToNull(row.Frecuencia),
      progresion: emptyToNull(row.Progresión),
      regresion: emptyToNull(row.Regresión),
      errores_comunes: emptyToNull(row['Errores comunes']),
      precauciones: emptyToNull(row.Precauciones),
      senales_detener: emptyToNull(row['Señales detener']),
      riesgo: requireNonEmpty(row.Riesgo, 'Riesgo', id),
      tags: parseTagsList(row.Tags),
      fuente_primaria: requireNonEmpty(row['Fuente primaria'], 'Fuente primaria', id),
      fuente_secundaria: emptyToNull(row['Fuente secundaria']),
      url_fuente: emptyToNull(row['URL fuente']),
      estado: estadoNorm.value,
      publicable_app: requireNonEmpty(row['Publicable app'], 'Publicable app', id),
      validacion_profesional: emptyToNull(row['Validación profesional']),
      notas: emptyToNull(row.Notas)
    },
    fixesApplied: { estadoTypo: estadoNorm.wasFixed }
  };
}
