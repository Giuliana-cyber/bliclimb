import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { zodResponseFormat } from 'openai/helpers/zod';
import { gatePlanGeneration, markFreePlanConsumed } from '@/lib/billing/gates';
import {
  canRegeneratePlan,
  getPlanRegenStatus,
  incrementPlanCount
} from '@/lib/entitlements';
import { checkRateLimit, commitRateLimit } from '@/lib/rate-limit';
import {
  FastPlanMetadataSchema,
  FastWeekSchema,
  type FastPlanMetadata,
  type FastWeek,
  type FastExercise
} from '@/lib/ai/fast-plan-schema';
import {
  PRO_STYLE_RULES,
  PRO_STYLE_EXAMPLES,
  EQUIPMENT_ADAPTATION_RULES
} from '@/lib/prompts/pro-style';
import {
  buildSafetyRetryMessage,
  validatePlanSafety,
  type SafetyViolation
} from '@/lib/ai/plan-safety';
import { evaluateProfile } from '@/lib/brain/validator';
import type { ProfileForRules } from '@/lib/brain/types';
import { detectLowConfidenceBlockCategory } from '@/lib/brain/monitoring/low-confidence-block-category';
import { evaluateGeneratedPlan } from '@/lib/brain/orchestrator/evaluate-generated-plan';
import { buildCorrectionMessage } from '@/lib/brain/orchestrator/build-correction-message';
import { toPlanForRules } from '@/lib/brain/orchestrator/plan-adapter';
import { SECTION_03_FALLBACK_MESSAGE } from '@/lib/brain/messages/section-03-programming';
import { extractLibraryTraceability, type LibraryTraceability } from '@/lib/ai/response-sources';
import { stripExplicitAttributions } from '@/lib/brain/sanitizers/citation-sanitizer';
import { UserProfileSchema } from '@/lib/schemas/user-profile';
import type { TrainingPlan, Week, Session, Exercise } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';
// Bloque 4 audit-360 · fix build: profileToPrompt vive en un módulo
// aparte porque Next.js prohíbe exports arbitrarios desde `route.ts`.
import { profileToPrompt } from './profile-to-prompt';

export const runtime = 'nodejs';
// Vercel Pro permite hasta 300s. Subimos al máximo para que la
// generación nunca timeoute aunque OpenAI tarde en una semana puntual.
// El timeout de 30s del cliente OpenAI sigue protegiendo cada llamada
// individual contra cuelgues.
export const maxDuration = 300;

// Compatibilidad: el endpoint también valida con Zod (UserProfileSchema)
// y devuelve 400 con detalle si falla. Esta función queda como tipo guard
// auxiliar para el resto del archivo, pero ya no decide la respuesta HTTP.
function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<UserProfile>;
  return Boolean(
    profile.id &&
      profile.character &&
      profile.climbingTime &&
      (profile.goal ||
        (Array.isArray(profile.goals) && profile.goals.length) ||
        profile.goalDescription) &&
      profile.planDuration &&
      profile.daysPerWeek
  );
}

// profileToPrompt vive en `./profile-to-prompt.ts` (import arriba). Next.js
// prohíbe exports arbitrarios desde archivos `route.ts` — solo permite
// GET/POST/etc. y `runtime`/`dynamic`/`maxDuration`. Al importarla en vez
// de definirla aquí, el build pasa y los tests pueden importarla directo
// del módulo.

const METADATA_PROMPT = `Eres un coach de escalada profesional del calibre de Lattice Training, Eric Hörst y Power Company. Diseñas planes serios para escaladores comprometidos. Hablas como entrenador que sabe escalar, no como app genérica.

Tu tarea ahora: diseñar la ESTRUCTURA META de un mesociclo. Defines objetivo, riesgos, fases por semana. NO generas ejercicios todavía.

${PRO_STYLE_RULES}

REGLAS DE ESTRUCTURA META:
- TODO en español (mexicano natural).
- mesocycleType: nombra la fase tipo coach pro. Ejemplos: "Mesociclo de carga — remodelamiento de tendones flexores", "Mesociclo de especialización — proyecto en roca", "Base técnica + fuerza submáxima", "Bloque de potencia y campus".
- athleteSummary (2-3 oraciones): describe al atleta como hablaría su coach. Su nivel, su contexto, lo que necesita.
- riskSummary (2-3 oraciones): específico al perfil. Si tiene dolor de dedos, mencionarlo. Si es principiante, advertir contra max hangs. Etc.
- equipmentSummary: qué se va a usar y cómo.
- progressionModel: cómo progresa carga/volumen entre semanas. Ej: "Semanas 1-2 adaptación al estímulo, semana 3 aumento de volumen, semana 4 descarga."
- weeklyFeedbackPrompt: pregunta concreta para el atleta cada semana. Ej: "¿Cómo se sintió el bloque trabajado? ¿Pudiste resolver los movimientos clave o todavía se te escapan?"
- recoveryGuidelines (3 items): oraciones completas, accionables. Ej: "Duerme mínimo 7h las noches de entrenamiento", "Aplica frío en dedos si sentes pinchazo después de sesión de dedos", "Hidratación con sales antes de sesiones largas".
- safetyRules (3 items): específicas al perfil. NO genéricas. NUNCA nombres de campos.
- weekThemes: EXACTAMENTE N semanas (la cantidad pedida).
  * Cada semana tiene theme corto (3-6 palabras) y objective específico.
  * focusAreas: 2-4 áreas concretas (ej: "fuerza max dedos", "potencia campus", "resistencia corta").
  * loadLevel: "introducción", "carga moderada", "carga alta", "descarga".
  * Semanas múltiplos de 4 (4, 8, 12) son descarga: deloadWeek=true, loadLevel="descarga".
  * phase (enum obligatorio, elige el más apropiado):
      - "base"   → fundamentos, alta variedad, volumen moderado.
      - "build"  → progresión, especificidad creciente, volumen alto.
      - "peak"   → intensidad máxima, volumen reducido, especificidad total.
      - "deload" → descarga (~50% volumen). USAR cuando deloadWeek=true.
      - "test"   → semana de evaluación (max hangs, tests de fuerza).`;

const WEEK_PROMPT = `Eres un coach de escalada profesional del calibre de Lattice Training, Eric Hörst y Power Company. Generas UNA SEMANA de entrenamiento serio. NO inventas fluff genérico de gym.

${PRO_STYLE_RULES}

${EQUIPMENT_ADAPTATION_RULES}

${PRO_STYLE_EXAMPLES}

REGLAS DURAS:
- TODO en español. JAMÁS inglés ("warmup", "workout", etc).
- safetyNotes, adjustmentRules, successCriteria contienen ORACIONES REALES DE CONTENIDO. JAMÁS nombres de campos del schema.
- Cada sesión tiene día exacto, título tipo "Día X — [Foco]", lugar (gym/roca/casa), duración estimada coherente con el perfil.
- stimulusCategory (enum obligatorio) — categoría dominante de la sesión:
    - "skill"           técnica/movimiento (drills, boulder de estilo). Distinto de "mental": skill = ejecución motora.
    - "strength"        fuerza máxima (max hangs, dominadas con lastre pesadas).
    - "power"           explosividad — 5-7 movs con descanso completo, campus, dinámicos.
    - "power-endurance" circuitos 30 movs / esfuerzos 45s-5min con recuperación incompleta.
    - "aerobic-base"    cubre TANTO ARC (baja intensidad continua 20-40 min) COMO Aero Cap (intensidad sostenible con bomba controlable).
    - "mobility"        movilidad activa, flexibilidad.
    - "mental"          visualización, foco, rutina pre-escalada, gestión del miedo. Distinto de "skill": mental = mente, no ejecución motora.
    - "warmup"          sesión ENTERA de activación (raro; solo si la sesión es 100% preparación).
    - "cooldown"        sesión ENTERA de vuelta a la calma (raro).
    - "rest"            día off o recovery activo SUAVE (yoga restorativo, caminar). Distinto de "deload": rest = SESIÓN off, deload = SEMANA descarga.
- intensityLevel (enum obligatorio):
    - "easy"   RPE ≤5, recuperación activa, aeróbico base suave.
    - "medium" RPE 6-7, trabajo moderado sostenido.
    - "hard"   RPE ≥8, sesiones intensas.
- objective de la sesión (1 oración corta y específica).
- why (1 oración corta): por qué existe esta sesión en el contexto del mesociclo.
- intensityTarget: "RPE 7-8/10", "65-75% capacidad max", "técnica al 60%", etc.
- safetyNotes (2-3): específicas A ESTA sesión (no genéricas).
- adjustmentRules (2-3): formato "Si X entonces Y". Ej: "Si el dolor de dedos supera 3/10, sustituye max hangs por suspensiones submáximas en extensión."
- successCriteria (2): cómo saber que la sesión salió bien. Ej: "Terminas con 1-2 reps en reserva en cada serie de hangs. Pudiste mantener técnica limpia en bloque trabajado."
- nutritionTip: 1 oración específica al estímulo del día.
- source: nombra autor/método REAL (Lattice Training, Eric Hörst, Power Company Climbing, Steve Bechtel/Climb Strong, Tom Randall, Tyler Nelson, Dave MacLeod, Catalyst Climbing, Hooper's Beta, Climbing Doctor).

MÍNIMOS POR SESIÓN:
- 3 ejercicios en warmup (general + específico mezclados)
- 4 ejercicios en mainBlock (la sustancia: dedos, potencia, proyecto, resistencia, fuerza, según el día)
- 2 ejercicios en cooldown (acondicionamiento: core, antagonistas, espalda baja, yoga)

NO uses ejercicios genéricos de gym ("sentadillas para piernas", "flexiones para tren superior"). USA nomenclatura real de escalada.

PARA CADA EJERCICIO INCLUYE OBLIGATORIAMENTE:
- howTo: array de 3-5 pasos CONCRETOS de ejecución. Específicos, accionables, en imperativo.
  Buenos: "Agarra la tabla con los dedos en la segunda falange (open hand o half crimp según la regleta)", "Mantén los hombros activos y separados de las orejas", "Cuelga 7 segundos y descansa 3 minutos antes de la siguiente serie".
  Malos: "Hacer el ejercicio bien", "Tener buena técnica".
- cues: array de 2-3 señales de sensación corporal — qué TIENE que sentir el atleta para saber que está ejecutando bien.
  Buenos: "Debes sentir el esfuerzo en los flexores de los dedos, no en las articulaciones", "El hombro debe sentirse activado, no colgando del trapecio", "Si sentís dolor punzante en codo o muñeca, parar y bajar carga".
  Malos: "Sentir el músculo trabajar".
- commonMistakes: array de 1-2 errores frecuentes a evitar en ESTE ejercicio.
  Buenos: "Apurar la serie y perder técnica de agarre en el último segundo", "Hombro adelantado y elevado durante el hang — busca silla activa".
  Malos: "No hacer bien el ejercicio".

Estos tres arrays son LA DIFERENCIA entre un plan útil y uno que solo lista nombres. Nunca devuelvas arrays vacíos.

Para CADA EJERCICIO también:
- riskLevel (enum obligatorio): "bajo" (movilidad, técnica sin carga), "medio" (fuerza submáx, dominadas normales) o "alto" (max hangs, campus, dinámicos, ejercicios con lastre pesado).
- stimulusCategory (enum obligatorio) — categoría dominante DEL EJERCICIO individual (mismo enum de 10 que la sesión):
    "warmup" para movilidad articular, activación (jumping jacks, band pull-aparts),
    "skill" para drills técnicos (silent feet, twist locks, quiet feet),
    "strength" para fuerza máxima de dedos y tracción (hangboard max hangs, dominadas con lastre pesado, front lever),
    "power" para explosividad (campus, dinámicos, boulder máximo),
    "power-endurance" para circuitos con recuperación incompleta (4x4, boulders repetidos, hangboard repeaters),
    "aerobic-base" para ARC / Aero Cap (escalada continua baja intensidad, traverse largo),
    "mobility" para estiramiento activo, PNF, extensor loading (band extensors),
    "mental" para visualización, rutina pre-escalada, respiración,
    "cooldown" para vuelta a la calma (foam rolling, estiramiento pasivo),
    "rest" para pausa activa entre bloques (caminar, hidratar).
Sé preciso — un Hangboard MaxHangs es "strength", no "warmup" ni "power". Un drill de silent feet es "skill", no "mobility". Bandas de extensores es "mobility" (o "warmup" si es de activación previa), no "strength".
- blockCategory (enum obligatorio, o null si no aplica) — categoría GATEABLE del ejercicio. Etiqueta HONESTAMENTE cuál de estas categorías corresponde al ejercicio; el middleware cruza esta etiqueta contra las prohibiciones del perfil del atleta. Categorías:
    "hangboard" — cualquier ejercicio en tabla/hangboard/fingerboard (max hangs, dead hangs, repeaters, tension boards con dedos, mini-edge protocols).
    "hangboard-intense" — SOLO si el hangboard es específicamente intenso: MaxHangs con lastre, IntHangs, protocolo de repeaters de alta densidad. En caso de duda entre hangboard y hangboard-intense, elegí "hangboard".
    "campus" — cualquier ejercicio en campus board (ladders, lock-offs, doubles, todas las variantes).
    "full-crimp" — ejercicios que EXIGEN posición de full crimp (arqueo completo con pulgar sobre el índice). Regletas <15mm con arqueo obligatorio caen acá. Si el ejercicio admite half crimp u open, NO es "full-crimp".
    "hit" — ejercicios del protocolo HIT (High Intensity Training para dedos, específicamente FM-014 y variantes).
    "pullups-weighted" — dominadas con lastre externo pesado (>0kg extra) o 1RM de dominada.
    "max-tests" — cualquier test de máximos: MIFS, Critical Force, dead hang hasta fallo, isometric pull-up force, RFD tests.
    "finger-training-any" — otros ejercicios de carga directa de dedos que no caen en las anteriores (ej: tension pinch, pinch blocks, no-hang lifts).
    null — si el ejercicio NO cae en ninguna categoría gateable (silent feet drill, foam roll, ARC de escalada continua, warmup articular, respiración, yoga). La MAYORÍA de ejercicios de un plan serán null; solo etiqueta con enum si el ejercicio encaja claramente en una categoría.
Etiquetá honestamente aunque el ejercicio esté en la lista de PROHIBIDOS del perfil — el middleware necesita saber para regenerar.`;

const SCHEMA_FIELD_NAMES = new Set([
  'safetyNotes',
  'adjustmentRules',
  'successCriteria',
  'nutritionTip',
  'source',
  'weekNumber',
  'theme',
  'objective',
  'focusAreas',
  'loadLevel',
  'deloadWeek',
  'sessions',
  'mainBlock',
  'warmup',
  'cooldown',
  'mesocycleType',
  'progressionModel',
  'weeklyFeedbackPrompt',
  'recoveryGuidelines',
  'safetyRules'
]);

function cleanStrings(items: string[]): string[] {
  return items
    .map((item) => item.trim())
    .filter((item) => item.length > 2 && !SCHEMA_FIELD_NAMES.has(item));
}

function toExercise(fast: FastExercise): Exercise {
  return {
    name: fast.name,
    description: fast.description,
    category: null,
    requiredEquipment: fast.equipment ? [fast.equipment] : null,
    riskLevel: fast.riskLevel,
    stimulusCategory: fast.stimulusCategory,
    blockCategory: fast.blockCategory,
    objective: null,
    prescription: null,
    sets: fast.sets,
    reps: fast.reps,
    duration: null,
    rest: fast.rest,
    intensity: fast.intensity,
    intensityPercent: null,
    rpeTarget: null,
    tempo: null,
    notes: fast.notes,
    timerSeconds: null,
    howTo: fast.howTo.length > 0 ? fast.howTo : null,
    // El campo interno del Exercise se llama `feelCues`; el del schema
    // OpenAI es `cues`. Lo mapeamos acá para no romper consumers.
    feelCues: fast.cues.length > 0 ? fast.cues : null,
    commonMistakes: fast.commonMistakes.length > 0 ? fast.commonMistakes : null,
    stopIf: null,
    regressions: fast.alternative ? [fast.alternative] : null,
    progressions: null,
    videoUrl: null,
    sourceConcept: null,
    alternative: fast.alternative,
    equipment: fast.equipment
  };
}

function buildPlan(
  metadata: FastPlanMetadata,
  fastWeeks: FastWeek[],
  profile: UserProfile,
  traceability: LibraryTraceability = { usedFileSearch: false, sourceNames: [] }
): TrainingPlan {
  const now = new Date().toISOString();
  const sortedWeeks = [...fastWeeks].sort((a, b) => a.weekNumber - b.weekNumber);

  const weeks: Week[] = sortedWeeks.map((week) => ({
    weekNumber: week.weekNumber,
    microcycleId: null,
    theme: week.theme,
    objective: week.objective,
    focusAreas: week.focusAreas,
    microcycle: week.objective,
    progression: week.loadLevel,
    progressionFocus: week.loadLevel,
    loadLevel: week.loadLevel,
    deloadWeek: week.deloadWeek,
    deloadFocus: null,
    phase: week.phase,
    sessions: week.sessions.map<Session>((session) => ({
      dayNumber: session.dayNumber,
      title: session.title,
      stimulusType: null,
      stimulusCategory: session.stimulusCategory,
      intensityLevel: session.intensityLevel,
      location: session.location,
      equipment: null,
      estimatedMinutes: session.estimatedMinutes,
      estimatedDurationMinutes: session.estimatedMinutes,
      objective: session.objective,
      why: session.why,
      intensityTarget: session.intensityTarget,
      warmup: session.warmup.map(toExercise),
      warmupGeneral: null,
      warmupSpecific: null,
      mainBlock: session.mainBlock.map(toExercise),
      finalBlock: null,
      cooldown: session.cooldown.map(toExercise),
      safetyNotes: cleanStrings(session.safetyNotes),
      adjustmentRules: cleanStrings(session.adjustmentRules),
      successCriteria: cleanStrings(session.successCriteria),
      nutritionTip: session.nutritionTip,
      source: session.source,
      completed: false,
      checkIn: null
    }))
  }));

  return {
    id: crypto.randomUUID(),
    profileId: profile.id,
    planVersion: 'fast-v2-parallel',
    objective: metadata.objective,
    mesocycleType: metadata.mesocycleType,
    microcycles: null,
    planningRationale: null,
    mainObjective: metadata.mainObjective,
    secondaryObjectives: metadata.secondaryObjectives,
    athleteSummary: metadata.athleteSummary,
    riskSummary: metadata.riskSummary,
    equipmentSummary: metadata.equipmentSummary,
    progressionModel: metadata.progressionModel,
    weeklyFeedbackPrompt: metadata.weeklyFeedbackPrompt,
    recoveryGuidelines: metadata.recoveryGuidelines,
    safetyRules: metadata.safetyRules,
    totalWeeks: profile.planDuration,
    currentWeek: 1,
    startDate: now,
    weeks,
    status: 'active',
    createdAt: now,
    // SOLO marcamos la badge cuando OpenAI realmente citó chunks del vector store.
    // Si usedFileSearch=true pero sourceNames vacío → el modelo no usó la biblioteca de verdad.
    usedFileSearch: traceability.usedFileSearch && traceability.sourceNames.length > 0,
    librarySources: traceability.sourceNames.length > 0 ? traceability.sourceNames : null,
    qualityScores: null
  };
}

const GROUNDING_PROMPT = `Eres un asistente que consulta DOS fuentes para extraer el conocimiento aplicable al plan de un escalador:
1. La biblioteca local (file_search en vector store) — papers, libros y blog posts ya curados.
2. La web (web_search_preview) — solo los sitios profesionales listados abajo.

Tu trabajo: para el perfil de escalador dado, extraer de ambas fuentes los principios, protocolos y prescripciones aplicables al diseño de su mesociclo.

FUENTES WEB PERMITIDAS (busca SOLO en estas):
- PubMed / Google Scholar: estudios sobre finger flexor training, climbing performance, periodization
- Lattice Training blog (latticetraining.com)
- Hooper's Beta (hoopersbeta.com)
- Climbing Doctor / Tyler Nelson (climbingdoctor.org)
- Power Company Climbing (powercompanyclimbing.com)
- Eva López blog / research papers
- Steve Bechtel / Climb Strong (climbstrong.com)
- Dave MacLeod (davemacleod.com)
- Eric Hörst (trainingforclimbing.com)

FUENTES WEB PROHIBIDAS (jamás cites de acá):
- Reddit, foros, opiniones anónimas
- Blogs de fitness genérico (Men's Health, bodybuilding.com)
- YouTube thumbnails o títulos sin contenido técnico
- Cualquier fuente sin autor identificable

Cuando busques en web, formula queries específicas como:
- "finger flexor max hangs protocol climbing PubMed"
- "climbing periodization mesocycle Lattice Training"
- "antagonist training climbers Tyler Nelson"

Responde:
- En bullets concisos. No prosa larga.
- Cita ejercicios y protocolos específicos cuando aparezcan en las fuentes (ej. "Eva López — Maximum Hangs en 10 segundos al límite").
- Cuando uses una fuente, deja el nombre entre paréntesis al final del bullet: "(Lattice Training)", "(Eva López, Sport Sciences 2019)".
- Si la fuente discute precauciones (dedos, RED-S, menores, lesiones), inclúyelas EXPLÍCITAS.
- Si NI la biblioteca NI la web (en las fuentes permitidas) tienen información relevante para una pregunta específica, dilo. NO inventes.

Devuelve un brief de máximo 12 bullets.`;

function extractResponsesText(response: unknown): string {
  // Soporta tanto el getter conveniente output_text como el array output[].
  const value = response as { output_text?: string; output?: Array<unknown> };
  if (typeof value.output_text === 'string' && value.output_text.trim().length > 0) {
    return value.output_text;
  }
  if (!Array.isArray(value.output)) return '';
  const chunks: string[] = [];
  for (const item of value.output) {
    const node = item as {
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    };
    if (node.type === 'message' && Array.isArray(node.content)) {
      for (const part of node.content) {
        if (part.type === 'output_text' && typeof part.text === 'string') {
          chunks.push(part.text);
        }
      }
    }
  }
  return chunks.join('\n');
}

async function groundFromLibrary(
  client: OpenAI,
  model: string,
  profile: UserProfile
): Promise<{ context: string; traceability: LibraryTraceability }> {
  const empty: LibraryTraceability = { usedFileSearch: false, sourceNames: [] };
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

  if (!vectorStoreId) {
    return { context: '', traceability: empty };
  }

  try {
    const response = await client.responses.create({
      model,
      max_output_tokens: 900,
      input: [
        { role: 'system', content: GROUNDING_PROMPT },
        {
          role: 'user',
          content: `Para este escalador, extrae de la biblioteca los principios y protocolos relevantes para diseñar su plan. Cita las fuentes.

Perfil:
${profileToPrompt(profile)}`
        }
      ],
      // web_search_preview habilita búsquedas web en vivo en la
      // Responses API. El GROUNDING_PROMPT acota a fuentes profesionales
      // listadas explícitamente; el modelo descarta resultados que no
      // sean de esa allowlist. El cast del array sortea que el union
      // de tipos del SDK no exporta el shape literal "web_search_preview"
      // (depende de la versión instalada).
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [vectorStoreId]
        },
        { type: 'web_search_preview' }
      ] as Parameters<typeof client.responses.create>[0]['tools']
    });

    const rawContext = extractResponsesText(response);
    const traceability = extractLibraryTraceability(response);

    // Capa B — limpieza determinística de atribuciones explícitas en el texto
    // que ve el LLM downstream. La traceability (metadata de fuentes) se
    // conserva intacta en `traceability.sourceNames` — solo removemos lo
    // estructurado del texto (líneas "Fuente:", secciones "Referencias",
    // frases "según el estudio de X"). Deja lo ambiguo a la Capa A del prompt.
    const { cleaned: context, stats: sanitizeStats } =
      stripExplicitAttributions(rawContext);
    if (
      sanitizeStats.linesStripped +
        sanitizeStats.sectionsStripped +
        sanitizeStats.phrasesReplaced >
      0
    ) {
      console.log(
        JSON.stringify({
          kind: 'grounding_sanitized',
          ...sanitizeStats,
          rawLength: rawContext.length,
          cleanedLength: context.length,
          timestamp: new Date().toISOString()
        })
      );
    }

    return { context, traceability };
  } catch (error) {
    // Silenciamos errores de RAG para no romper la generación si File Search falla.
    console.warn(
      JSON.stringify({
        kind: 'plan_grounding_failed',
        message: error instanceof Error ? error.message : 'unknown'
      })
    );
    return { context: '', traceability: empty };
  }
}

type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string };

async function generateMetadata(
  client: OpenAI,
  model: string,
  profile: UserProfile,
  groundingContext: string
): Promise<FastPlanMetadata> {
  const messages: ChatMessage[] = [{ role: 'system', content: METADATA_PROMPT }];

  if (groundingContext) {
    messages.push({
      role: 'system',
      content: `BIBLIOTECA — principios y protocolos relevantes para este atleta (extraídos de fuentes reales del vector store, citados con [fuente]):

${groundingContext}

Usa estos principios cuando definas mesociclo, semanas, áreas de foco, recoveryGuidelines y safetyRules. Si una recomendación contradice algo de la biblioteca, prioriza la biblioteca.`
    });
  }

  messages.push({
    role: 'user',
    content: `Diseña la estructura meta de un plan de ${profile.planDuration} semanas para este escalador con ${profile.daysPerWeek} sesiones por semana.\n\nPerfil:\n${profileToPrompt(profile)}`
  });

  const completion = await client.chat.completions.parse({
    model,
    response_format: zodResponseFormat(FastPlanMetadataSchema, 'metadata'),
    messages
  });

  const metadata = completion.choices[0]?.message.parsed;
  if (!metadata) {
    throw new Error('OpenAI no devolvió la metadata del plan.');
  }
  return metadata;
}

async function generateWeek(
  client: OpenAI,
  model: string,
  profile: UserProfile,
  weekMeta: FastPlanMetadata['weekThemes'][number],
  retryCorrection: string | null = null,
  groundingContext = '',
  blockedCategories: readonly string[] = []
): Promise<FastWeek> {
  const equipment = profile.equipment?.length ? profile.equipment : ['home'];
  const equipmentLines = equipment
    .map((item) => `- ${item}`)
    .join('\n');

  // Sub-fase final del middleware — inyección de PROHIBIDOS por §1.x.
  // Cuando el perfil dispara §1.1 (menores) o §1.2 (<2 años), Bill recibe
  // acá la lista de blockCategory que NO puede usar. El validador
  // section01PlanGating es la red que atrapa si igual se le cuela.
  const prohibitedBlock = blockedCategories.length
    ? `\n\n🚫 CATEGORÍAS PROHIBIDAS PARA ESTE ATLETA (regla dura de seguridad §1.x):\n${blockedCategories.map((c) => `- ${c}`).join('\n')}\n\nNO incluyas NINGÚN ejercicio que caiga en esas categorías. Reemplaza por alternativas de skill / mobility / aerobic-base / ejercicios técnicos sin carga directa de dedos. Si un ejercicio cae en una categoría prohibida, cambialo por otro que no. Y ETIQUETA HONESTAMENTE blockCategory de cada exercise (aunque tengas que marcar algo prohibido, marcalo — el middleware necesita saber).`
    : '';

  const messages = [
    { role: 'system' as const, content: WEEK_PROMPT },
    {
      role: 'user' as const,
      content: `Genera la SEMANA ${weekMeta.weekNumber} del plan completo.

EQUIPO DISPONIBLE DEL ATLETA (única lista permitida):
${equipmentLines}

⚠️ REGLA INVIOLABLE: cualquier ejercicio que requiera equipo FUERA de esta lista está PROHIBIDO. No incluyas hangboard, campus, muro, TRX, pesas, etc si no aparecen arriba. Aplica las reglas de adaptación de equipo del system prompt.${prohibitedBlock}

Contexto de la semana:
- Tema: ${weekMeta.theme}
- Objetivo: ${weekMeta.objective}
- Áreas de foco: ${weekMeta.focusAreas.join(', ')}
- Carga: ${weekMeta.loadLevel}
- Descarga: ${weekMeta.deloadWeek ? 'sí' : 'no'}

Debe tener EXACTAMENTE ${profile.daysPerWeek} sesiones (campo "sessions" con ${profile.daysPerWeek} elementos), una por cada día disponible.

Perfil completo:
${profileToPrompt(profile)}${groundingContext ? `\n\nBRIEF DE BIBLIOTECA Y FUENTES (usa esto para diseñar ejercicios y protocolos reales):\n${groundingContext}` : ''}

Devuelve la semana con weekNumber=${weekMeta.weekNumber}.`
    }
  ];

  if (retryCorrection) {
    messages.push({ role: 'user' as const, content: retryCorrection });
  }

  // Helper interno: una llamada parse + chequeo de truncación. Si se
  // corta, mapea el error a algo descriptivo y lo tira.
  const attempt = async (maxTokens: number, label: string) => {
    const completion = await client.chat.completions
      .parse({
        model,
        max_tokens: maxTokens,
        response_format: zodResponseFormat(FastWeekSchema, 'week'),
        messages
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'unknown';
        // El SDK lanza con mensajes específicos según la causa: length
        // cap, refusal de safety, schema inválido. Marcamos truncación
        // con un prefijo reconocible para que el caller decida si
        // reintentar con cap más alto.
        if (/length.*limit|max_tokens|cut off|truncated/i.test(message)) {
          throw new Error(`TRUNCATION_${label}: ${message}`);
        }
        if (/refus|safety|policy/i.test(message)) {
          throw new Error(
            `OpenAI rechazó generar la semana ${weekMeta.weekNumber} por su política de contenido. Revisá la descripción de tu objetivo y reintentá.`
          );
        }
        if (/schema|invalid.*json|parse/i.test(message)) {
          throw new Error(
            `OpenAI devolvió un JSON inválido para la semana ${weekMeta.weekNumber}. Reintentá; suele resolverse en el segundo intento.`
          );
        }
        throw new Error(
          `Fallo generando la semana ${weekMeta.weekNumber}: ${message}`
        );
      });

    // El SDK a veces devuelve `parsed` con JSON parcial cuando hubo
    // truncación — chequeo defensivo.
    const choice = completion.choices[0];
    if (choice?.finish_reason === 'length') {
      throw new Error(`TRUNCATION_${label}: finish_reason=length`);
    }
    const week = choice?.message.parsed;
    if (!week) {
      throw new Error(`OpenAI no devolvió la semana ${weekMeta.weekNumber}.`);
    }
    return week;
  };

  // 12000: el modelo default es gpt-4o-mini (rápido), techo alto no
  // agrega latencia notable — solo asegura que el JSON nunca se trunque
  // en planes densos (sesiones con muchos ejercicios + notas largas).
  // Histórico: 2500 → 4000 → 8000 → 12000 según casos border reales.
  try {
    return await attempt(12_000, '12k');
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (!message.startsWith('TRUNCATION_')) {
      throw err;
    }
    // Retry automático con 16k. Logueamos para tracking de cuán seguido
    // pasa esto en producción.
    console.log(
      JSON.stringify({
        kind: 'plan_week_retry_truncation',
        weekNumber: weekMeta.weekNumber,
        firstAttemptError: message
      })
    );
    try {
      return await attempt(16_000, '16k');
    } catch (retryErr) {
      const retryMessage = retryErr instanceof Error ? retryErr.message : 'unknown';
      // Después del retry, presentamos un mensaje limpio al cliente.
      if (retryMessage.startsWith('TRUNCATION_')) {
        throw new Error(
          `La semana ${weekMeta.weekNumber} salió truncada de OpenAI incluso con 16k tokens. Reintentá; si persiste, simplificá tu objetivo o equipo.`
        );
      }
      throw retryErr;
    }
  }
}

function logSafetyViolations(
  attempt: 'first' | 'retry',
  profile: UserProfile,
  violations: SafetyViolation[]
) {
  // Stub de observability — un Sentry/Logtail aterriza aquí en el futuro.
  // Lo escribimos como JSON estructurado para que sea parseable.
  console.warn(
    JSON.stringify({
      kind: 'plan_safety_violation',
      attempt,
      profile: {
        id: profile.id,
        age: profile.age,
        climbingTime: profile.climbingTime,
        currentFingerPain: profile.currentFingerPain
      },
      violations: violations.map((v) => ({
        rule: v.rule,
        reason: v.reason,
        trigger: v.triggerExercise
      }))
    })
  );
}

export async function POST(request: Request) {
  // Orden: auth → validaciones baratas (gate, canRegenerate, body parse,
  // schema) → checkRateLimit → OpenAI → commitRateLimit → return.
  // El rate limit solo se "gasta" cuando la request es válida y va a
  // tirar trabajo real contra OpenAI; los 4xx tempranos no cuentan.
  // Las fallas 5xx (OpenAI throw, truncación, safety unrecoverable)
  // saltan al catch global y NUNCA llaman a commitRateLimit, así que
  // tampoco cuentan.
  const gate = await gatePlanGeneration();
  if (!gate.allowed) return gate.response;
  const userId = gate.userId;

  // Límite mensual: 2 generaciones (gratis + regeneración pagada cuentan
  // juntos). Si ya consumió las 2, devolvemos 429 con la fecha de reset
  // para que la UI pueda mostrarla.
  if (userId !== 'dev-anon') {
    const allowed = await canRegeneratePlan(userId);
    if (!allowed) {
      const status = await getPlanRegenStatus(userId);
      const resetDate = new Date(status.resetAt);
      const formattedReset = `${resetDate.getUTCDate()}/${resetDate.getUTCMonth() + 1}`;
      return NextResponse.json(
        {
          error: 'plan_limit_reached',
          message: `Solo puedes generar 2 planes por mes. Tu límite se renueva el ${formattedReset}.`,
          status
        },
        { status: 429 }
      );
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is required to generate a training plan.' },
      { status: 500 }
    );
  }

  let body: { profile?: unknown };
  try {
    body = (await request.json()) as { profile?: unknown };
  } catch {
    return NextResponse.json(
      { error: 'invalid_profile', issues: [{ message: 'Body no es JSON válido.' }] },
      { status: 400 }
    );
  }

  const parsed = UserProfileSchema.safeParse(body.profile);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_profile',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          code: issue.code,
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }

  // El payload validado por Zod es estructuralmente equivalente a UserProfile.
  // Casteamos para mantener el tipo del resto del flujo (helpers que esperan
  // UserProfile sin opcionales).
  const profile = parsed.data as UserProfile;
  if (!isUserProfile(profile)) {
    // Defensa en profundidad: si por algún motivo el Zod aceptó algo que el
    // resto del código no puede consumir, fallamos con detalle accionable.
    return NextResponse.json(
      {
        error: 'invalid_profile',
        issues: [{ message: 'Perfil válido en schema pero incompleto para generación.' }]
      },
      { status: 400 }
    );
  }

  // Check rate limit (no incrementa). Va acá porque todas las
  // validaciones 4xx baratas ya pasaron: solo "gastamos" la chequera
  // si el request es realmente válido y vamos a tirar trabajo contra
  // OpenAI. El commit ocurre al final del path de éxito.
  const rl = await checkRateLimit('plan');
  if (!rl.ok) {
    return NextResponse.json(
      {
        code: 'rate_limited',
        error: rl.userMessage,
        resetSeconds: rl.retryAfter
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfter) }
      }
    );
  }

  // timeout: 120s. Ahora estamos en Vercel Pro (maxDuration=300s) y
  // una generación de plan puede involucrar varias llamadas paralelas
  // que en cola de OpenAI pueden tardar > 30s individualmente. 30s
  // cortaba semanas válidas y forzaba reintentos. 120s deja margen
  // cómodo sin acercarnos al límite de la function.
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 120_000
  });
  // gpt-4o-mini por defecto — la estructura de plan no necesita la
  // potencia de gpt-4o y mini es ~5-10x más rápido. En Hobby de Vercel
  // (60s timeout) gpt-4o + 4 semanas en paralelo se acerca peligrosamente
  // al límite; mini deja margen cómodo.
  //
  // Si en el futuro la calidad sufre, podemos volver setando
  // OPENAI_PLAN_MODEL=gpt-4o en producción (override env).
  const model = process.env.OPENAI_PLAN_MODEL ?? 'gpt-4o-mini';

  try {
    // 1+2. Grounding y metadata corren EN PARALELO.
    //
    // Antes: grounding → metadata → weeks (secuencial los 2 primeros).
    // El grounding (file_search vía Responses API) suele tardar 8-15s,
    // y bloqueaba la generación de metadata aunque ésta ya estaba lista
    // para arrancar con solo el profile. Ahora ambas corren juntas.
    //
    // Trade-off: la metadata corre sin groundingContext para paralelizarse
    // con el grounding (esa decisión vale toda la latencia que ganamos).
    // Pero el groundingContext SÍ se inyecta en cada generateWeek de
    // abajo — donde más impacta para que los ejercicios sean específicos
    // y las fuentes sean trazables.
    const [grounding, metadata] = await Promise.all([
      groundFromLibrary(client, model, profile),
      generateMetadata(client, model, profile, '')
    ]);
    const { context: groundingContext, traceability } = grounding;

    // Si la metadata trajo menos o más semanas, ajustamos a planDuration
    const themes = metadata.weekThemes
      .slice(0, profile.planDuration)
      .sort((a, b) => a.weekNumber - b.weekNumber);

    while (themes.length < profile.planDuration) {
      const last = themes[themes.length - 1];
      const nextWeekNumber = themes.length + 1;
      const isDeload = nextWeekNumber % 4 === 0;
      themes.push({
        weekNumber: nextWeekNumber,
        theme: last?.theme ?? 'Consolidación',
        objective: last?.objective ?? 'Consolidar lo aprendido',
        focusAreas: last?.focusAreas ?? [],
        loadLevel: last?.loadLevel ?? 'moderado',
        deloadWeek: isDeload,
        phase: isDeload ? 'deload' : (last?.phase ?? 'base')
      });
    }

    // Sub-fase final del middleware — Momento 1: evaluar perfil una sola vez
    // para inyectar las categorías bloqueadas (§1.1/§1.2/etc) al WEEK_PROMPT.
    // El objetivo es que Bill *ya* respete la prohibición desde la primera
    // generación. El validador section01PlanGating es la red posterior por si
    // igual mete algo prohibido.
    const profileForRules: ProfileForRules = {
      age: profile.age ?? '',
      climbingTime: profile.climbingTime ?? '',
      currentFingerPain: profile.currentFingerPain ?? 0,
      currentShoulderPain: profile.currentShoulderPain ?? 0,
      currentElbowPain: profile.currentElbowPain ?? 0,
      injuries: profile.injuries ?? [],
      sleep: profile.sleep ?? '',
      // Fase 4 Pieza 2 — pasa el coach activo para que §1.3 (dolor ≥3)
      // sirva el mensaje adaptado (Bill neutro vs Senda Derivación 3).
      character: profile.character === 'senda' ? 'senda' : 'bill'
    };
    const brainContext = evaluateProfile(profileForRules, {
      profileId: profile.id ?? null
    });
    const blockedCategoriesForPrompt = Array.from(brainContext.blockedCategories);

    // 3. Generar todas las semanas EN PARALELO. Cada semana recibe el
    //    groundingContext para que los ejercicios y protocolos vengan
    //    anclados en biblioteca + web (allowlist).
    let fastWeeks = await Promise.all(
      themes.map((theme) =>
        generateWeek(
          client,
          model,
          profile,
          theme,
          null,
          groundingContext,
          blockedCategoriesForPrompt
        )
      )
    );
    let plan = buildPlan(metadata, fastWeeks, profile, traceability);

    // Validación de seguridad — dos capas coexisten (deuda registrada):
    //   1. Legacy (validatePlanSafety) por 2-4 semanas hasta probar en prod.
    //   2. Brain (evaluateGeneratedPlan) — 4 validators plan-level:
    //      §1.gating, §3.x, §14.2 (blocking) + §10.6 (advisory).
    // Ambos disparan retry al mismo loop. Hasta 3 intentos totales.
    // Contador NO se toca en el retry; solo en éxito final (línea ~995).
    const MAX_RETRIES = 3;
    let brainEval = evaluateGeneratedPlan(toPlanForRules(plan), profileForRules);
    let safety = validatePlanSafety(plan, profile);
    let attempt = 0;

    while ((brainEval.blocking.length > 0 || !safety.ok) && attempt < MAX_RETRIES) {
      attempt++;

      // Log del pase actual (primer intento = 'first', luego 'retry-N').
      if (!safety.ok) {
        logSafetyViolations(attempt === 1 ? 'first' : 'retry', profile, safety.violations);
      }
      if (brainEval.blocking.length > 0) {
        console.log(
          JSON.stringify({
            kind: 'plan_brain_violations',
            attempt,
            profileId: profile.id ?? null,
            blocking: brainEval.blocking.map((v) => ({
              rule: v.rule,
              detailsKind: v.details.kind,
              location: v.location
            })),
            advisory: brainEval.advisory.map((v) => ({ rule: v.rule })),
            timestamp: new Date().toISOString()
          })
        );
      }

      // Ensamble de correction: legacy + brain. Bill recibe ambos hints.
      const legacyMsg = safety.ok ? '' : buildSafetyRetryMessage(safety.violations);
      const brainMsg =
        brainEval.blocking.length > 0
          ? buildCorrectionMessage(brainEval.blocking, brainEval.advisory)
          : '';
      const correction = [legacyMsg, brainMsg].filter(Boolean).join('\n\n');

      // Semanas ofensivas: unión de las que reporta legacy + brain.
      const offending = new Set<number>();
      if (!safety.ok) {
        for (const v of safety.violations) {
          if (typeof v.triggerExercise?.week === 'number') offending.add(v.triggerExercise.week);
        }
      }
      for (const v of brainEval.blocking) {
        if (typeof v.location.weekNumber === 'number') offending.add(v.location.weekNumber);
      }

      const regenerated = await Promise.all(
        themes.map(async (theme) => {
          if (offending.size === 0 || offending.has(theme.weekNumber)) {
            return generateWeek(
              client,
              model,
              profile,
              theme,
              correction,
              groundingContext,
              blockedCategoriesForPrompt
            );
          }
          return fastWeeks.find((w) => w.weekNumber === theme.weekNumber)!;
        })
      );

      fastWeeks = regenerated;
      plan = buildPlan(metadata, fastWeeks, profile, traceability);
      brainEval = evaluateGeneratedPlan(toPlanForRules(plan), profileForRules);
      safety = validatePlanSafety(plan, profile);
    }

    if (brainEval.blocking.length > 0 || !safety.ok) {
      // Tras MAX_RETRIES intentos, no publicamos plan inseguro.
      if (!safety.ok) logSafetyViolations('retry', profile, safety.violations);
      console.log(
        JSON.stringify({
          kind: 'plan_unrecoverable_after_retries',
          attempts: MAX_RETRIES,
          profileId: profile.id ?? null,
          finalBlocking: brainEval.blocking.map((v) => ({
            rule: v.rule,
            detailsKind: v.details.kind,
            location: v.location
          })),
          legacyViolations: safety.ok ? [] : safety.violations.map((v) => ({ rule: v.rule, reason: v.reason })),
          timestamp: new Date().toISOString()
        })
      );
      return NextResponse.json(
        {
          code: 'plan_unsafe_after_retry',
          error: SECTION_03_FALLBACK_MESSAGE.text,
          violations: [
            ...(safety.ok ? [] : safety.violations.map((v) => ({ rule: v.rule, reason: v.reason }))),
            ...brainEval.blocking.map((v) => ({ rule: v.rule, reason: v.details.kind }))
          ]
        },
        { status: 422 }
      );
    }

    // Monitoreo NO bloqueante: emite JSON por cada ejercicio sospechoso de
    // mal-etiquetado de blockCategory (strength/power + alto + null en perfil
    // con bloqueos de §1.1/§1.2). Con 2-4 semanas de prod decidimos si
    // agregar `loadsFingersDirectly` al schema o refinar el prompt. No afecta
    // la respuesta al usuario ni cuenta contadores.
    for (const evt of detectLowConfidenceBlockCategory(
      {
        weeks: plan.weeks.map((w) => ({
          weekNumber: w.weekNumber,
          phase: w.phase ?? null,
          deloadWeek: w.deloadWeek ?? false,
          sessions: w.sessions.map((s) => ({
            dayNumber: s.dayNumber,
            title: s.title,
            stimulusCategory: s.stimulusCategory ?? null,
            intensityLevel: s.intensityLevel ?? null,
            estimatedMinutes: s.estimatedMinutes,
            warmup: s.warmup.map((e) => ({
              name: e.name,
              stimulusCategory: e.stimulusCategory ?? null,
              riskLevel: e.riskLevel ?? null,
              blockCategory: e.blockCategory ?? null
            })),
            mainBlock: s.mainBlock.map((e) => ({
              name: e.name,
              stimulusCategory: e.stimulusCategory ?? null,
              riskLevel: e.riskLevel ?? null,
              blockCategory: e.blockCategory ?? null
            })),
            cooldown: s.cooldown.map((e) => ({
              name: e.name,
              stimulusCategory: e.stimulusCategory ?? null,
              riskLevel: e.riskLevel ?? null,
              blockCategory: e.blockCategory ?? null
            }))
          }))
        }))
      },
      profileForRules
    )) {
      console.log(JSON.stringify(evt));
    }

    // CONTRATO IMPORTANTE: TODOS los contadores se mueven solo en éxito.
    //   - markFreePlanConsumed + incrementPlanCount: el plan mensual
    //   - commitRateLimit: el sliding window del rate limiter
    // Si OpenAI falla, trunca, o el reintento de safety no resuelve, los
    // `throw` saltan al `catch` global y este bloque NO se ejecuta.
    // El usuario no paga intentos fallidos en NINGUNO de los contadores.
    await markFreePlanConsumed(userId);
    if (userId !== 'dev-anon') {
      await incrementPlanCount(userId);
    }
    await commitRateLimit('plan');
    return NextResponse.json({ plan });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : 'No pudimos generar tu plan.';
    // Log explícito para auditoría: cuando llegamos acá, NO se incrementó
    // el contador mensual ni se consumió el plan gratis (el código de
    // arriba nunca se ejecutó). Si alguna vez detectás que se cobra un
    // intento fallido, mirá este log para confirmar que llegó acá.
    console.log(
      JSON.stringify({
        kind: 'plan_generation_failed_counter_not_consumed',
        userId,
        message: message.slice(0, 200)
      })
    );
    const isRateLimit =
      message.toLowerCase().includes('rate limit') ||
      message.toLowerCase().includes('429') ||
      message.toLowerCase().includes('tokens per min');
    const isTimeout =
      caughtError instanceof Error &&
      (caughtError.name === 'APIConnectionTimeoutError' ||
        caughtError.name === 'APIConnectionError' ||
        /timeout|aborted/i.test(message));

    if (isTimeout) {
      return NextResponse.json(
        {
          code: 'upstream_timeout',
          error: 'El servicio de IA tardó demasiado. Intentá de nuevo.'
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: message,
        code: isRateLimit ? 'openai_rate_limited' : 'plan_generation_failed'
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
