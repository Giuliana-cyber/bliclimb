// Paso 5 · Matcher híbrido · tipos.
//
// El matcher post-hoc (resolveToCanonical) toma una propuesta del LLM y la
// mapea a una fila real de public.exercises. Es la ÚNICA vía al catálogo
// curado del sistema — todo ejercicio que llega al usuario pasa por acá.
//
// Diseño: dos capas coexisten.
//   1. Matcher (materializa): filtra el pool que llega al usuario.
//      Determinístico. Aquí se cierran operativamente los 6 huecos del
//      checklist del Paso 5.
//   2. Rules `lib/brain/rules/*.ts` (valida): red posterior que atrapa
//      violations en el plan generado. Sigue existiendo como defensa
//      en profundidad.

import type { BlockingContext, ProfileForRules } from '../types';
import type {
  StimulusCategory,
  SuggestedCategory
} from '@/lib/ai/fast-plan-schema';

// -------------------- Row del pool --------------------
//
// Refleja las columnas de public.exercises que el matcher necesita para
// filtrar y rankear. Se carga con SELECT explícito para no traer
// descripciones enormes que no vamos a usar.

/**
 * Row del pool. Refleja EXACTAMENTE las columnas de `public.exercises` según
 * `supabase/migrations/0010_exercises_schema.sql` + canónicas de 0015-0028.
 *
 * NO inventar columnas. Si el matcher necesita datos que no existen en la
 * tabla, hay que agregarlos en migración explícita ANTES de referenciarlos
 * acá. El test de contrato (`pool-loader.contract.test.ts`) falla al build
 * si esta interfaz pide algo que no está en el schema.
 */
export interface CatalogRow {
  // Identidad (columnas NOT NULL del schema).
  id: string;
  nombre: string;
  tipo: string;
  categoria: string;
  equipo: string;
  descripcion: string;
  riesgo: string;
  estado: string;
  publicable_app: string;
  fuente_primaria: string;
  tipo_registro: string;
  tags: string[];

  // Contenido curado nullable (columnas del schema base 0010).
  subcategoria: string | null;
  objetivo: string | null;
  nivel: string | null;
  tipo_escalador: string | null;
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
  fuente_secundaria: string | null;
  url_fuente: string | null;
  validacion_profesional: string | null;
  notas: string | null;

  // Canónicas agregadas por migraciones 0015-0028.
  nivel_canonico: string | null;
  categoria_canonica: string | null;
  proposito: string | null;
  momento: string | null;
  equipo_canonico: string[] | null;
  stimulus_derivado: string | null;
}

// -------------------- Input al matcher --------------------
//
// Lo que Bill emite (extracto de FastExercise) + el contexto necesario
// para aplicar filtros de gate.

export interface MatcherInput {
  /** Propuesta del LLM — el "razonamiento libre" de Bill. */
  proposal: {
    name: string;
    suggestedCategory: SuggestedCategory;
    stimulusCategory: StimulusCategory;
    /** Cuál bloque del plan (warmup/mainBlock/cooldown) va a alojar el resolved. */
    momento: 'calentamiento' | 'principal' | 'enfriamiento';
    /** Original description del LLM — usada como fallback si el catálogo no la tiene. */
    description?: string;
  };
  /** Perfil del usuario ya evaluado (BrainContext) + campos crudos que el matcher lee directo. */
  profile: ProfileForRules & {
    /** Equipo disponible del usuario (9 tokens del onboarding). */
    equipment: string[];
    /** Reps máximas de dominada estricta (Deuda #12). Si null → filtro C.1 excluye conservador. */
    maxPullupReps?: number | null;
  };
  brainContext: BlockingContext;
}

// -------------------- Output del matcher --------------------

export type MatcherResult =
  | { kind: 'resolved'; row: CatalogRow; level: FallbackLevel; ranking: RankingScore }
  | { kind: 'rejected'; reason: RejectReason; hintForLLM: string };

/** Nivel del fallback en el que se resolvió (para telemetría + tests). */
export type FallbackLevel = 'L1' | 'L2' | 'L3' | 'L5';

/**
 * Razones de rechazo (L5 · el matcher no pudo encontrar nada seguro).
 * Se traduce a hint del prompt para que el LLM reproponga.
 */
export type RejectReason =
  | 'no-match-any-level'
  | 'gate-excluded-all-candidates'
  | 'pool-empty-for-momento'
  | 'equipment-mismatch';

/** Score de ranking exhibido en debug + tests. Determinístico. */
export interface RankingScore {
  /** Match exacto de categoría (0 o 1). */
  categoryExact: number;
  /** Match de stimulus (0 o 1). */
  stimulusExact: number;
  /** Distancia de nivel (0=exacto, 1=adyacente, 2+=distante). */
  nivelDistance: number;
  /** Proposito preferido (entrenamiento > prevencion). */
  propositoPreferred: number;
  /** Levenshtein normalizado sobre nombre (0-1). Solo tie-breaker. */
  nameSimilarity: number;
}

// -------------------- Pool loader (interfaz) --------------------
//
// Abstracción que permite inyectar mocks in-memory en los tests sin tocar
// Supabase. El adapter real (`supabasePoolLoader`) hace SELECT filtrado.
// El adapter test (`inMemoryPoolLoader`) recibe el array y lo devuelve.

export interface PoolLoader {
  loadPool(): Promise<CatalogRow[]>;
}
