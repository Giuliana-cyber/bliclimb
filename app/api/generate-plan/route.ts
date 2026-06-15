import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { zodResponseFormat } from 'openai/helpers/zod';
import { markFreePlanUsed, requirePlanGenerationAccess } from '@/lib/billing/subscription';
import { enforceRateLimit } from '@/lib/rate-limit';
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
import { extractLibraryTraceability, type LibraryTraceability } from '@/lib/ai/response-sources';
import type { TrainingPlan, Week, Session, Exercise } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

function profileToPrompt(profile: UserProfile) {
  const lines: string[] = [];
  lines.push(`Coach: ${profile.character === 'senda' ? 'Senda' : 'Bill'}`);
  if (profile.name) lines.push(`Nombre: ${profile.name}`);
  if (profile.age) lines.push(`Edad: ${profile.age}`);
  if (profile.sex) lines.push(`Sexo: ${profile.sex}`);
  if (profile.weight) lines.push(`Peso: ${profile.weight} kg`);
  if (profile.height) lines.push(`Estatura: ${profile.height} cm`);
  lines.push(`Tiempo escalando: ${profile.climbingTime}`);
  if (profile.disciplines?.length) lines.push(`Disciplinas: ${profile.disciplines.join(', ')}`);
  if (profile.level) lines.push(`Nivel: ${profile.level}`);
  if (profile.setting) lines.push(`Setting: ${profile.setting}`);
  if (profile.goals?.length) lines.push(`Objetivos: ${profile.goals.join(', ')}`);
  if (profile.goalDescription) lines.push(`Descripción objetivo: ${profile.goalDescription}`);
  if (profile.project) lines.push(`Proyecto: ${profile.project}`);
  if (profile.rockProjectDescription)
    lines.push(`Contexto proyecto: ${profile.rockProjectDescription}`);
  lines.push(`Días por semana: ${profile.daysPerWeek}`);
  if (profile.availableDays?.length)
    lines.push(`Días disponibles: ${profile.availableDays.join(', ')}`);
  lines.push(
    `Duración sesión: ${profile.sessionDuration} min (máx ${profile.maxSessionDuration})`
  );
  if (profile.equipment?.length) lines.push(`Equipo: ${profile.equipment.join(', ')}`);
  if (profile.equipmentNotes) lines.push(`Setup: ${profile.equipmentNotes}`);
  if (profile.previousTraining) lines.push(`Plan anterior: ${profile.previousTraining}`);
  if (profile.pullUpAbility) lines.push(`Dominadas: ${profile.pullUpAbility}`);
  if (profile.fingerTrainingExperience)
    lines.push(`Exp. dedos: ${profile.fingerTrainingExperience}`);
  if (profile.campusExperience) lines.push(`Exp. campus: ${profile.campusExperience}`);
  if (profile.outdoorFrequency) lines.push(`Frecuencia roca: ${profile.outdoorFrequency}`);
  lines.push(`Agresividad: ${profile.trainingAggressiveness ?? 'balanced'}`);
  if (profile.injuries?.length) lines.push(`Lesiones: ${profile.injuries.join(', ')}`);
  if (profile.injuryNotes) lines.push(`Notas lesión: ${profile.injuryNotes}`);
  lines.push(
    `Dolor actual — dedos ${profile.currentFingerPain}/10, hombro ${profile.currentShoulderPain}/10, codo ${profile.currentElbowPain}/10`
  );
  if (profile.sleep) lines.push(`Sueño: ${profile.sleep}`);
  if (profile.energy) lines.push(`Energía: ${profile.energy}`);
  if (profile.warmup) lines.push(`Calentamiento habitual: ${profile.warmup}`);
  lines.push(`Duración plan: ${profile.planDuration} semanas`);
  return lines.join('\n');
}

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
  * Semanas múltiplos de 4 (4, 8, 12) son descarga: deloadWeek=true, loadLevel="descarga".`;

const WEEK_PROMPT = `Eres un coach de escalada profesional del calibre de Lattice Training, Eric Hörst y Power Company. Generas UNA SEMANA de entrenamiento serio. NO inventas fluff genérico de gym.

${PRO_STYLE_RULES}

${EQUIPMENT_ADAPTATION_RULES}

${PRO_STYLE_EXAMPLES}

REGLAS DURAS:
- TODO en español. JAMÁS inglés ("warmup", "workout", etc).
- safetyNotes, adjustmentRules, successCriteria contienen ORACIONES REALES DE CONTENIDO. JAMÁS nombres de campos del schema.
- Cada sesión tiene día exacto, título tipo "Día X — [Foco]", lugar (gym/roca/casa), duración estimada coherente con el perfil.
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

NO uses ejercicios genéricos de gym ("sentadillas para piernas", "flexiones para tren superior"). USA nomenclatura real de escalada.`;

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
    riskLevel: null,
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
    howTo: null,
    feelCues: null,
    commonMistakes: null,
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
    sessions: week.sessions.map<Session>((session) => ({
      dayNumber: session.dayNumber,
      title: session.title,
      stimulusType: null,
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

const GROUNDING_PROMPT = `Eres un asistente que consulta una biblioteca de fuentes profesionales de entrenamiento de escalada (Eva López, Eric Hörst, Power Company, Lattice, Climb Strong, investigación RED-S, etc).

Tu trabajo: para el perfil de escalador dado, extraer de la biblioteca los principios, protocolos y prescripciones aplicables al diseño de su mesociclo.

Responde:
- En bullets concisos. No prosa larga.
- Cita ejercicios y protocolos específicos cuando aparezcan en las fuentes (ej. "Eva López — Maximum Hangs en 10 segundos al límite").
- Si la fuente discute precauciones (dedos, RED-S, menores, lesiones), inclúyelas EXPLÍCITAS.
- Si la biblioteca no tiene información relevante para una pregunta específica, dilo. NO inventes.

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
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [vectorStoreId]
        }
      ]
    });

    const context = extractResponsesText(response);
    const traceability = extractLibraryTraceability(response);

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
  retryCorrection: string | null = null
): Promise<FastWeek> {
  const equipment = profile.equipment?.length ? profile.equipment : ['home'];
  const equipmentLines = equipment
    .map((item) => `- ${item}`)
    .join('\n');

  const messages = [
    { role: 'system' as const, content: WEEK_PROMPT },
    {
      role: 'user' as const,
      content: `Genera la SEMANA ${weekMeta.weekNumber} del plan completo.

EQUIPO DISPONIBLE DEL ATLETA (única lista permitida):
${equipmentLines}

⚠️ REGLA INVIOLABLE: cualquier ejercicio que requiera equipo FUERA de esta lista está PROHIBIDO. No incluyas hangboard, campus, muro, TRX, pesas, etc si no aparecen arriba. Aplica las reglas de adaptación de equipo del system prompt.

Contexto de la semana:
- Tema: ${weekMeta.theme}
- Objetivo: ${weekMeta.objective}
- Áreas de foco: ${weekMeta.focusAreas.join(', ')}
- Carga: ${weekMeta.loadLevel}
- Descarga: ${weekMeta.deloadWeek ? 'sí' : 'no'}

Debe tener EXACTAMENTE ${profile.daysPerWeek} sesiones (campo "sessions" con ${profile.daysPerWeek} elementos), una por cada día disponible.

Perfil completo:
${profileToPrompt(profile)}

Devuelve la semana con weekNumber=${weekMeta.weekNumber}.`
    }
  ];

  if (retryCorrection) {
    messages.push({ role: 'user' as const, content: retryCorrection });
  }

  const completion = await client.chat.completions.parse({
    model,
    max_tokens: 8000,
    response_format: zodResponseFormat(FastWeekSchema, 'week'),
    messages
  });

  const week = completion.choices[0]?.message.parsed;
  if (!week) {
    throw new Error(`OpenAI no devolvió la semana ${weekMeta.weekNumber}.`);
  }
  return week;
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
  const limit = await enforceRateLimit('plan');
  if (!limit.ok) {
    return NextResponse.json(
      {
        code: 'rate_limited',
        error: limit.userMessage,
        resetSeconds: limit.resetSeconds
      },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.resetSeconds) }
      }
    );
  }

  const subscriptionError = requirePlanGenerationAccess();
  if (subscriptionError) return subscriptionError;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is required to generate a training plan.' },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { profile?: unknown };
  if (!isUserProfile(body.profile)) {
    return NextResponse.json(
      { error: 'Perfil incompleto. Vuelve al onboarding y completa todos los pasos.' },
      { status: 400 }
    );
  }

  const profile = body.profile;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // gpt-4o por defecto — mucha mejor calidad de coaching que gpt-4o-mini.
  // Costo justificado por la suscripción de $1/mes (1 generación cada N días).
  const model = process.env.OPENAI_PLAN_MODEL ?? 'gpt-4o';

  try {
    // 1. Grounding desde la biblioteca (File Search vía Responses API).
    //    Solo se hace UNA vez por plan, no por semana, para no inflar latencia.
    const { context: groundingContext, traceability } = await groundFromLibrary(
      client,
      model,
      profile
    );

    // 2. Metadata estructurada (con el grounding como contexto adicional).
    const metadata = await generateMetadata(client, model, profile, groundingContext);

    // Si la metadata trajo menos o más semanas, ajustamos a planDuration
    const themes = metadata.weekThemes
      .slice(0, profile.planDuration)
      .sort((a, b) => a.weekNumber - b.weekNumber);

    while (themes.length < profile.planDuration) {
      const last = themes[themes.length - 1];
      themes.push({
        weekNumber: themes.length + 1,
        theme: last?.theme ?? 'Consolidación',
        objective: last?.objective ?? 'Consolidar lo aprendido',
        focusAreas: last?.focusAreas ?? [],
        loadLevel: last?.loadLevel ?? 'moderado',
        deloadWeek: (themes.length + 1) % 4 === 0
      });
    }

    // 3. Generar todas las semanas EN PARALELO (sin RAG — la velocidad importa).
    let fastWeeks = await Promise.all(
      themes.map((theme) => generateWeek(client, model, profile, theme))
    );
    let plan = buildPlan(metadata, fastWeeks, profile, traceability);

    // Validación de seguridad enforceable server-side
    let safety = validatePlanSafety(plan, profile);

    if (!safety.ok) {
      logSafetyViolations('first', profile, safety.violations);

      // Reintento: regeneramos SOLO las semanas que tienen el problema, con feedback correctivo.
      const correction = buildSafetyRetryMessage(safety.violations);
      const offendingWeekNumbers = new Set(
        safety.violations
          .map((v) => v.triggerExercise?.week)
          .filter((w): w is number => typeof w === 'number')
      );

      const regenerated = await Promise.all(
        themes.map(async (theme) => {
          if (offendingWeekNumbers.size === 0 || offendingWeekNumbers.has(theme.weekNumber)) {
            return generateWeek(client, model, profile, theme, correction);
          }
          return fastWeeks.find((w) => w.weekNumber === theme.weekNumber)!;
        })
      );

      fastWeeks = regenerated;
      plan = buildPlan(metadata, fastWeeks, profile, traceability);
      safety = validatePlanSafety(plan, profile);

      if (!safety.ok) {
        // Segundo fallo → no devolvemos plan inseguro al usuario.
        logSafetyViolations('retry', profile, safety.violations);
        return NextResponse.json(
          {
            code: 'plan_unsafe_after_retry',
            error:
              'Generamos el plan pero contiene ejercicios que no son seguros para tu perfil. Estamos revisando esto — vuelve a intentarlo en un momento o ajusta tu perfil (lesiones, edad, tiempo escalando).',
            violations: safety.violations.map((v) => ({
              rule: v.rule,
              reason: v.reason
            }))
          },
          { status: 422 }
        );
      }
    }

    markFreePlanUsed();
    return NextResponse.json({ plan });
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : 'No pudimos generar tu plan.';
    const isRateLimit =
      message.toLowerCase().includes('rate limit') ||
      message.toLowerCase().includes('429') ||
      message.toLowerCase().includes('tokens per min');

    return NextResponse.json(
      {
        error: message,
        code: isRateLimit ? 'openai_rate_limited' : 'plan_generation_failed'
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
