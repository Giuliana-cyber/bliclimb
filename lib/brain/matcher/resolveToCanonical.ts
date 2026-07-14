// Paso 5 · Matcher híbrido · core.
//
// resolveToCanonical(input, pool) mapea una propuesta del LLM a una fila
// real del catálogo curado, aplicando 6 filtros de gate + equipo + nivel +
// momento + ranking + fallback en escalera L1→L2→L3→L5 (sin L4).
//
// El matcher es determinístico. Los mismos inputs producen exactamente el
// mismo output — sin embeddings, sin ML, sin sampling.
//
// Principio invariante (Paso 5 · aprobado por Giuliana 2026-07-13):
// los filtros de gate NO se relajan entre niveles. Un ejercicio "parecido"
// no puede saltarse el gating. Lo único que se relaja L1→L2→L3 son
// criterios de similitud/preferencia (nombre, nivel adyacente, categoría
// emparentada por stimulus).

import type { StimulusCategory, SuggestedCategory } from '@/lib/ai/fast-plan-schema';
import type { BlockedZone } from '../types';
import type {
  CatalogRow,
  FallbackLevel,
  MatcherInput,
  MatcherResult,
  RankingScore
} from './types';

// -------------------- Constantes de ordenamiento --------------------

const NIVEL_ORDER: Record<string, number> = {
  principiante: 1,
  'principiante-intermedio': 2,
  intermedio: 3,
  'intermedio-avanzado': 4,
  avanzado: 5,
  todos: 0 // pasan siempre
};

/**
 * Compatibilidad de nivel del ejercicio contra el perfil.
 * `todos` siempre compatible. Devuelve la distancia (>= 0) o `null` si
 * el ejercicio es más avanzado que lo aceptable para el perfil.
 */
function nivelDistance(rowNivel: string | null, profileTope: number): number | null {
  if (!rowNivel) return null;
  if (rowNivel === 'todos') return 0;
  const n = NIVEL_ORDER[rowNivel];
  if (n === undefined) return null;
  if (n > profileTope) return null;
  return profileTope - n;
}

/**
 * Tope de nivel aceptable para el perfil.
 *   u16                → principiante (1)
 *   climbingTime !== 'more3' (menos de 2 años) → principiante-intermedio (2)
 *   climbingTime = 'more3'                     → avanzado (5)
 *   Sin info → intermedio (3) como conservador.
 */
function computeProfileTope(profile: MatcherInput['profile']): number {
  if (profile.age === 'u16') return NIVEL_ORDER['principiante']!;
  const ct = profile.climbingTime;
  if (ct === 'start' || ct === 'less1' || ct === '1to3') {
    return NIVEL_ORDER['principiante-intermedio']!;
  }
  if (ct === 'more3') return NIVEL_ORDER['avanzado']!;
  return NIVEL_ORDER['intermedio']!;
}

// -------------------- Emparentamiento por stimulus (L3) --------------------
//
// L3 relaja categoria_canonica a categorías con el mismo stimulus_derivado
// esperado por la propuesta del LLM. La tabla es tal que dos categorías
// emparentadas comparten el mismo estímulo neuromuscular general.

const CATEGORY_SIBLINGS: Record<SuggestedCategory, SuggestedCategory[]> = {
  // fuerza-traccion incluye resistencia-anaerobica porque power-endurance de
  // tracción (4x4, laps sostenidos, PE circuits) vive ahí en el catálogo, no
  // en fuerza-traccion. Sin este link, un Bill que pide "fuerza-traccion +
  // power-endurance" cae en un match L1 con fuerza-traccion + strength
  // (mismatch de estímulo). Bug reportado por Giuliana el 2026-07-13.
  'fuerza-dedos': ['fuerza-traccion', 'boulder', 'resistencia-anaerobica'],
  'fuerza-traccion': ['fuerza-dedos', 'boulder', 'resistencia-anaerobica'],
  'fuerza-empuje': ['core', 'fuerza-tren-inferior'],
  'fuerza-tren-inferior': ['fuerza-empuje', 'core'],
  potencia: ['campus', 'boulder', 'fuerza-traccion'],
  campus: ['potencia', 'boulder', 'fuerza-dedos'],
  'resistencia-aerobica': ['resistencia-anaerobica', 'boulder'],
  'resistencia-anaerobica': ['resistencia-aerobica', 'potencia', 'boulder'],
  tecnica: ['boulder', 'movilidad'],
  boulder: ['tecnica', 'fuerza-dedos', 'potencia', 'resistencia-anaerobica'],
  movilidad: ['hombros-escapulas', 'munecas-antebrazos', 'core'],
  core: ['fuerza-empuje', 'movilidad'],
  'hombros-escapulas': ['movilidad', 'munecas-antebrazos'],
  'munecas-antebrazos': ['movilidad', 'hombros-escapulas'],
  piel: ['movilidad']
};

// -------------------- Stimulus check (compatibilidad) --------------------
//
// El schema del plan (StimulusCategorySchema) tiene 10 valores. El backfill
// del catálogo (stimulus_derivado) tiene solo 6 entrenables: strength, power,
// power-endurance, aerobic-base, skill, mobility. Los otros 4 valores del
// schema (warmup, cooldown, mental, rest) son META del rol de la sesión,
// no un estímulo entrenable — no tienen equivalente en el catálogo.
//
// Cuando Bill emite un stimulus meta, el matcher no puede filtrar por él:
// no hay filas del catálogo con stimulus_derivado='warmup'. Lo tratamos
// como "cualquier stimulus_derivado sirve" (típicamente mobility para
// warmup/cooldown).
//
// Cuando Bill emite un stimulus entrenable, el matcher DEBE respetarlo en
// L1/L2 — sino entrega un ejercicio del estímulo equivocado y rompe la
// periodización (bug detectado 2026-07-13: FT-1ARMNEG matcheó proposal
// power-endurance porque L1 solo miraba categoría).

const TRAINABLE_STIMULI: ReadonlySet<StimulusCategory> = new Set<StimulusCategory>([
  'strength',
  'power',
  'power-endurance',
  'aerobic-base',
  'skill',
  'mobility'
]);

/**
 * Devuelve true si el stimulus de la propuesta es entrenable — o sea si
 * corresponde exigir stimulus_derivado exacto en el filtro L1/L2. Los
 * stimulus meta (warmup/cooldown/mental/rest) no se filtran.
 */
function requiresStimulusMatch(stimulus: StimulusCategory): boolean {
  return TRAINABLE_STIMULI.has(stimulus);
}

/**
 * Compatibilidad de una fila con el stimulus solicitado. Los stimulus meta
 * pasan siempre (el matcher deja al ranking + momento la selección). Los
 * entrenables exigen match exacto.
 */
function passesStimulus(row: CatalogRow, proposal: MatcherInput['proposal']): boolean {
  if (!requiresStimulusMatch(proposal.stimulusCategory)) return true;
  return row.stimulus_derivado === proposal.stimulusCategory;
}

// -------------------- Filtros de gate (los 6 huecos del checklist) --------------------

/**
 * Filtro A.1 · §1.3 blockedZones → categoría bloqueada.
 * `fingers-pulleys` → excluir `fuerza-dedos`.
 * `elbow` → excluir `fuerza-traccion` y `campus` (tracción).
 * `shoulder` → excluir hangboard-intense (fuerza-dedos avanzado con hangboard).
 */
function passesA1(row: CatalogRow, zones: ReadonlySet<BlockedZone>): boolean {
  if (zones.size === 0) return true;
  const cat = row.categoria_canonica;
  if (zones.has('fingers-pulleys') && cat === 'fuerza-dedos') return false;
  if (zones.has('elbow') && (cat === 'fuerza-traccion' || cat === 'campus')) return false;
  if (zones.has('shoulder')) {
    // Excluir hangboard intenso avanzado (proxy: fuerza-dedos con hangboard en equipo y nivel alto).
    const hasHangboard = row.equipo_canonico?.includes('hangboard') ?? false;
    const advanced =
      row.nivel_canonico === 'intermedio-avanzado' || row.nivel_canonico === 'avanzado';
    if (cat === 'fuerza-dedos' && hasHangboard && advanced) return false;
  }
  return true;
}

/**
 * Filtro A.2 · §5.2 grip restriction → tag `carga:regleta-pequena`.
 */
function passesA2(row: CatalogRow, gripRestrictions: ReadonlySet<string>): boolean {
  if (!gripRestrictions.has('no-small-crimps-below-15mm')) return true;
  return !row.tags.includes('carga:regleta-pequena');
}

/**
 * Filtro B.1 · Power-max (Deuda #10) → tag `riesgo-lesion:power-max`.
 */
function passesB1(row: CatalogRow, blockedCategories: ReadonlySet<string>): boolean {
  if (!blockedCategories.has('power-max')) return true;
  return !row.tags.includes('riesgo-lesion:power-max');
}

/**
 * Filtro B.2 · Proposito='rehab' → solo si el perfil tiene lesión declarada.
 * Perfil sano nunca recibe rehab, ni por parentesco (L3).
 */
function passesB2(row: CatalogRow, profile: MatcherInput['profile']): boolean {
  if (row.proposito !== 'rehab') return true;
  const hasInjuries = (profile.injuries?.length ?? 0) > 0;
  const hasPain =
    (profile.currentFingerPain ?? 0) >= 3 ||
    (profile.currentElbowPain ?? 0) >= 3 ||
    (profile.currentShoulderPain ?? 0) >= 3;
  return hasInjuries || hasPain;
}

/**
 * Filtro C.1 · §2.4 prerequisito de reps → tag `prerequisito:15-pullups`.
 * Conservador: `maxPullupReps=null` excluye igual que `<15` (mejor un
 * ejercicio menos que uno peligroso).
 */
function passesC1(row: CatalogRow, maxPullupReps: number | null | undefined): boolean {
  if (!row.tags.includes('prerequisito:15-pullups')) return true;
  if (maxPullupReps == null) return false; // conservador
  return maxPullupReps >= 15;
}

/**
 * Filtros de categoría enum ya wired antes del Paso 4.
 * Cierra `finger-training-any`, `hangboard`, `hangboard-intense`, `campus`,
 * `hit`, `pullups-weighted`, `max-tests`, `full-crimp` contra el pool del
 * matcher. Estos filtros son adicionales a los tags específicos porque el
 * matcher opera sobre el catálogo real (no sobre el enum que el LLM emite).
 */
function passesLegacyBlockedCategories(
  row: CatalogRow,
  blockedCategories: ReadonlySet<string>
): boolean {
  if (blockedCategories.size === 0) return true;
  const cat = row.categoria_canonica;
  const eq = row.equipo_canonico ?? [];
  const tags = row.tags;

  // finger-training-any → toda fuerza-dedos.
  if (blockedCategories.has('finger-training-any') && cat === 'fuerza-dedos') {
    return false;
  }
  // hangboard → cualquier fila con hangboard en equipo.
  if (blockedCategories.has('hangboard') && eq.includes('hangboard')) return false;
  // hangboard-intense → fila con tag hangboard-intense.
  if (
    blockedCategories.has('hangboard-intense') &&
    tags.includes('riesgo-lesion:hangboard-intense')
  ) {
    return false;
  }
  // campus → categoría campus.
  if (blockedCategories.has('campus') && cat === 'campus') return false;
  // hit → tag hit.
  if (blockedCategories.has('hit') && tags.includes('riesgo-lesion:hit')) return false;
  // pullups-weighted → tag pullups-weighted.
  if (
    blockedCategories.has('pullups-weighted') &&
    tags.includes('riesgo-lesion:pullups-weighted')
  ) {
    return false;
  }
  // full-crimp → hoy sin filas taggeadas (el catálogo evita el gesto).
  //   Cuando aparezcan filas con `carga:full-crimp`, filtrarlas acá.
  // max-tests → solo `tipo_registro='test'`, ya no llegan al pool.

  return true;
}

// -------------------- Filtro invariante (los 6 gate + equipo + momento) --------------------
//
// Se aplica IDÉNTICO en L1, L2, L3. Solo cambia entre niveles el criterio
// de compatibilidad de categoría y nivel.

function passesGateAndEquipment(
  row: CatalogRow,
  input: MatcherInput,
  requestedMomento: 'calentamiento' | 'principal' | 'enfriamiento'
): boolean {
  const { profile, brainContext } = input;

  // Momento del bloque — filtro estricto.
  if (row.momento !== requestedMomento) return false;

  // Los 6 gate del checklist (A.3 es plan-level, no matcher-level).
  if (!passesA1(row, brainContext.blockedZones)) return false;
  if (!passesA2(row, brainContext.gripRestrictions)) return false;
  if (!passesB1(row, brainContext.blockedCategories)) return false;
  if (!passesB2(row, profile)) return false;
  if (!passesC1(row, profile.maxPullupReps)) return false;

  // Categorías enum ya wired (finger-training-any, hangboard, etc.).
  if (!passesLegacyBlockedCategories(row, brainContext.blockedCategories)) {
    return false;
  }

  // Equipo — array del ejercicio ⊆ equipment del perfil.
  //   Excepción: [home] siempre pasa (peso corporal).
  const eq = row.equipo_canonico ?? [];
  if (eq.length === 0) return true; // sin equipo, siempre OK
  if (eq.length === 1 && eq[0] === 'home') return true; // convención bodyweight
  const userEquipment = new Set(profile.equipment ?? []);
  for (const token of eq) {
    if (!userEquipment.has(token)) return false;
  }

  return true;
}

// -------------------- Ranking --------------------

/**
 * Levenshtein normalizado (0-1). Usado SOLO como tie-breaker. Es O(m*n),
 * ejecutado a lo sumo sobre nombres cortos (<80 chars).
 */
function nameLevenshteinNormalized(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const m = s.length;
  const n = t.length;
  if (m === 0 && n === 0) return 1;
  if (m === 0 || n === 0) return 0;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const cur = dp[j]!;
      const cost = s.charCodeAt(i - 1) === t.charCodeAt(j - 1) ? 0 : 1;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + cost);
      prev = cur;
    }
  }
  const dist = dp[n]!;
  return 1 - dist / Math.max(m, n);
}

/**
 * Score de un candidato. Determinístico, sin ML.
 */
function scoreCandidate(
  row: CatalogRow,
  input: MatcherInput,
  profileTope: number
): RankingScore {
  const categoryExact = row.categoria_canonica === input.proposal.suggestedCategory ? 1 : 0;
  const stimulusExact = row.stimulus_derivado === input.proposal.stimulusCategory ? 1 : 0;
  const dist = nivelDistance(row.nivel_canonico, profileTope);
  const nivelDistanceScore = dist == null ? 99 : dist;
  const propositoPreferred = row.proposito === 'entrenamiento' ? 1 : 0;
  const nameSimilarity = nameLevenshteinNormalized(row.nombre, input.proposal.name);
  return {
    categoryExact,
    stimulusExact,
    nivelDistance: nivelDistanceScore,
    propositoPreferred,
    nameSimilarity
  };
}

/**
 * Compara dos scores en orden lexicográfico según el diseño Paso 5:
 *   1. Category exacto (desc)
 *   2. Stimulus exacto (desc)
 *   3. Nivel distancia (asc — más cercano mejor)
 *   4. Proposito preferido (desc)
 *   5. Similitud nombre (desc)
 *   6. ID alfabético (asc)  — desempate final para determinismo estricto
 */
function compareCandidates(
  a: { row: CatalogRow; score: RankingScore },
  b: { row: CatalogRow; score: RankingScore }
): number {
  if (a.score.categoryExact !== b.score.categoryExact) {
    return b.score.categoryExact - a.score.categoryExact;
  }
  if (a.score.stimulusExact !== b.score.stimulusExact) {
    return b.score.stimulusExact - a.score.stimulusExact;
  }
  if (a.score.nivelDistance !== b.score.nivelDistance) {
    return a.score.nivelDistance - b.score.nivelDistance;
  }
  if (a.score.propositoPreferred !== b.score.propositoPreferred) {
    return b.score.propositoPreferred - a.score.propositoPreferred;
  }
  if (Math.abs(a.score.nameSimilarity - b.score.nameSimilarity) > 1e-9) {
    return b.score.nameSimilarity - a.score.nameSimilarity;
  }
  return a.row.id.localeCompare(b.row.id);
}

// -------------------- Filtros específicos por nivel --------------------

/**
 * L1 — match exacto de categoría + stimulus (si es entrenable). Nivel
 * dentro del tope. Todos los gate.
 *
 * El filtro por stimulus se agregó el 2026-07-13 tras detectar que un
 * proposal de "power-endurance" en fuerza-traccion aterrizaba en
 * FT-1ARMNEG (fuerza-traccion + strength). Sin match de stimulus, L1
 * podía entregar cualquier fila de la categoría solicitada aunque
 * rompiera la periodización del plan.
 */
function filterL1(pool: CatalogRow[], input: MatcherInput, profileTope: number): CatalogRow[] {
  return pool.filter((row) => {
    if (!passesGateAndEquipment(row, input, input.proposal.momento)) return false;
    if (row.categoria_canonica !== input.proposal.suggestedCategory) return false;
    if (!passesStimulus(row, input.proposal)) return false;
    const dist = nivelDistance(row.nivel_canonico, profileTope);
    return dist !== null;
  });
}

/**
 * L2 — misma categoría + stimulus compatible, nivel adyacente inferior (o
 * más bajo). Todos los gate. Se llama sólo cuando L1 devuelve vacío.
 */
function filterL2(pool: CatalogRow[], input: MatcherInput, profileTope: number): CatalogRow[] {
  return pool.filter((row) => {
    if (!passesGateAndEquipment(row, input, input.proposal.momento)) return false;
    if (row.categoria_canonica !== input.proposal.suggestedCategory) return false;
    if (!passesStimulus(row, input.proposal)) return false;
    const dist = nivelDistance(row.nivel_canonico, profileTope);
    if (dist === null) return false;
    return true;
  });
}

/**
 * L3 — categorías emparentadas por stimulus. Todos los gate.
 *
 * L3 relaja la categoría a los siblings del CATEGORY_SIBLINGS, pero
 * mantiene el mismo filtro de stimulus que L1/L2 (si Bill pidió un
 * entrenable, el resultado debe tener ese stimulus_derivado). Esto es
 * lo que fuerza a "fuerza-traccion + power-endurance" → resistencia-
 * anaerobica + power-endurance en vez de FT-1ARMNEG + strength.
 * (Bug 2026-07-13).
 */
function filterL3(pool: CatalogRow[], input: MatcherInput, profileTope: number): CatalogRow[] {
  const siblings = CATEGORY_SIBLINGS[input.proposal.suggestedCategory] ?? [];
  const allowed = new Set<string>([input.proposal.suggestedCategory, ...siblings]);
  return pool.filter((row) => {
    if (!passesGateAndEquipment(row, input, input.proposal.momento)) return false;
    if (!row.categoria_canonica || !allowed.has(row.categoria_canonica)) return false;
    if (!passesStimulus(row, input.proposal)) return false;
    const dist = nivelDistance(row.nivel_canonico, profileTope);
    return dist !== null;
  });
}

// -------------------- Public API --------------------

/**
 * Resuelve la propuesta de Bill contra el pool.
 * Aplica L1 → L2 → L3; si nada matchea, retorna `kind: 'rejected'` para
 * que el caller decida (típicamente retry con hint al LLM).
 *
 * Función pura: mismos inputs → mismo output.
 */
export function resolveToCanonical(
  input: MatcherInput,
  pool: CatalogRow[]
): MatcherResult {
  const profileTope = computeProfileTope(input.profile);

  // L1 — match exacto.
  const l1 = filterL1(pool, input, profileTope);
  if (l1.length > 0) {
    return rankAndPick(l1, input, profileTope, 'L1');
  }

  // L2 — nivel adyacente.
  const l2 = filterL2(pool, input, profileTope);
  if (l2.length > 0) {
    return rankAndPick(l2, input, profileTope, 'L2');
  }

  // L3 — categoría emparentada.
  const l3 = filterL3(pool, input, profileTope);
  if (l3.length > 0) {
    return rankAndPick(l3, input, profileTope, 'L3');
  }

  // L5 — rechazar. El LLM debe reproponer.
  return {
    kind: 'rejected',
    reason: 'no-match-any-level',
    hintForLLM: buildHintForLLM(input)
  };
}

function rankAndPick(
  candidates: CatalogRow[],
  input: MatcherInput,
  profileTope: number,
  level: FallbackLevel
): MatcherResult {
  const scored = candidates.map((row) => ({ row, score: scoreCandidate(row, input, profileTope) }));
  scored.sort(compareCandidates);
  const winner = scored[0]!;
  return { kind: 'resolved', row: winner.row, level, ranking: winner.score };
}

function buildHintForLLM(input: MatcherInput): string {
  const parts: string[] = [];
  parts.push(
    `No hay ejercicio seguro en el catálogo para tu propuesta "${input.proposal.name}" (categoría "${input.proposal.suggestedCategory}", stimulus "${input.proposal.stimulusCategory}") con el perfil actual.`
  );
  const bc = input.brainContext.blockedCategories;
  if (bc.size > 0) {
    parts.push(`Categorías bloqueadas por el perfil: ${Array.from(bc).join(', ')}.`);
  }
  if (input.brainContext.blockedZones.size > 0) {
    parts.push(`Zonas con lesión: ${Array.from(input.brainContext.blockedZones).join(', ')}.`);
  }
  parts.push('Sugerí otra alternativa que respete esos bloqueos.');
  return parts.join(' ');
}

// -------------------- Exports para tests --------------------

export const _internals = {
  NIVEL_ORDER,
  CATEGORY_SIBLINGS,
  TRAINABLE_STIMULI,
  computeProfileTope,
  nivelDistance,
  requiresStimulusMatch,
  passesStimulus,
  passesA1,
  passesA2,
  passesB1,
  passesB2,
  passesC1,
  passesLegacyBlockedCategories,
  passesGateAndEquipment,
  filterL1,
  filterL2,
  filterL3,
  scoreCandidate,
  compareCandidates
} as const;
