import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { NextResponse } from 'next/server';
import { requireSubscriptionAccess } from '@/lib/billing/subscription';
import { buildPlanGeneratorPrompt } from '@/lib/prompts/plan-generator';
import type { TrainingPlan } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';
import { TrainingPlanSchema } from '@/lib/ai/training-plan-schema';
import { extractLibraryTraceability, type LibraryTraceability } from '@/lib/ai/response-sources';

export const runtime = 'nodejs';

const MAX_PLAN_GENERATION_ATTEMPTS = 2;
const PLAN_MAX_OUTPUT_TOKENS = 8000;
const MAX_STRUCTURED_SESSIONS = 8;
const DAYS_BY_COUNT = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

type ExerciseDraft = Omit<
  TrainingPlan['weeks'][number]['sessions'][number]['warmup'][number],
  'sets' | 'reps' | 'rest' | 'intensity' | 'timerSeconds'
> & {
  sets?: number | null;
  reps?: string | null;
  rest?: string | null;
  intensity?: string | null;
  timerSeconds?: number | null;
};

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const profile = value as Partial<UserProfile>;
  const hasGoal =
    Boolean(profile.goal) ||
    Boolean(Array.isArray(profile.goals) && profile.goals.length) ||
    Boolean(profile.goalDescription?.trim());

  return Boolean(
    profile.id &&
      profile.character &&
      profile.climbingTime &&
      hasGoal &&
      profile.planDuration &&
      profile.daysPerWeek
  );
}

function normalizePlan(
  plan: TrainingPlan,
  profile: UserProfile,
  libraryTraceability?: LibraryTraceability
): TrainingPlan {
  const now = new Date().toISOString();

  return {
    ...plan,
    id: plan.id || crypto.randomUUID(),
    profileId: profile.id,
    totalWeeks: profile.planDuration,
    currentWeek: plan.currentWeek || 1,
    status: 'active',
    createdAt: plan.createdAt || now,
    startDate: plan.startDate || now,
    usedFileSearch: libraryTraceability?.usedFileSearch ?? plan.usedFileSearch,
    librarySources: libraryTraceability?.sourceNames.length
      ? libraryTraceability.sourceNames
      : plan.librarySources,
    weeks: plan.weeks.map((week) => ({
      ...week,
      sessions: week.sessions.map((session) => ({
        ...session,
        completed: false,
        checkIn: null
      }))
    }))
  };
}

function flattenPlanText(plan: TrainingPlan) {
  return plan.weeks
    .flatMap((week) => [
      week.theme,
      ...week.focusAreas,
      ...week.sessions.flatMap((session) => [
        session.title,
        session.location,
        session.nutritionTip,
        session.source,
        ...session.warmup.flatMap((exercise) => Object.values(exercise)),
        ...session.mainBlock.flatMap((exercise) => Object.values(exercise)),
        ...session.cooldown.flatMap((exercise) => Object.values(exercise))
      ])
    ])
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .join(' ')
    .toLowerCase();
}

function getUnavailableEquipmentViolations(plan: TrainingPlan, profile: UserProfile) {
  const text = flattenPlanText(plan);
  const violations: string[] = [];

  const unavailablePatterns = [
    {
      available: profile.equipment.includes('gym'),
      label: 'gym de escalada',
      patterns: ['climbing gym', 'gimnasio de escalada', 'muro indoor', 'boulder indoor']
    },
    {
      available: profile.equipment.includes('hangboard'),
      label: 'hangboard',
      patterns: ['hangboard', 'fingerboard', 'beastmaker', 'tabla multipresa', 'maxhang']
    },
    {
      available: profile.equipment.includes('campus'),
      label: 'campus board',
      patterns: ['campus board', 'campus']
    },
    {
      available: profile.equipment.includes('weights'),
      label: 'gym de pesas',
      patterns: ['barbell', 'dumbbell', 'kettlebell', 'mancuerna', 'mancuernas', 'barra con peso', 'máquina de pesas']
    }
  ];

  unavailablePatterns.forEach((item) => {
    if (!item.available && item.patterns.some((pattern) => text.includes(pattern))) {
      violations.push(item.label);
    }
  });

  if (!profile.equipment.includes('gym')) {
    const hasGymLocation = plan.weeks.some((week) =>
      week.sessions.some((session) => session.location.toLowerCase() === 'gym')
    );

    if (hasGymLocation) {
      violations.push('ubicación gym');
    }
  }

  return Array.from(new Set(violations));
}

function getDetailViolations(plan: TrainingPlan) {
  const violations: string[] = [];

  plan.weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      const label = `Semana ${week.weekNumber}, día ${session.dayNumber}`;

      if (session.warmup.length < 3) {
        violations.push(`${label}: calentamiento con menos de 3 ejercicios`);
      }

      if (session.mainBlock.length < 2) {
        violations.push(`${label}: bloque principal con menos de 2 ejercicios`);
      }

      if (session.cooldown.length < 2) {
        violations.push(`${label}: vuelta a la calma con menos de 2 ejercicios`);
      }

      if (!session.source || session.source.trim().length < 10) {
        violations.push(`${label}: falta una fuente o criterio de entrenamiento útil`);
      }

      [...session.warmup, ...session.mainBlock, ...session.cooldown].forEach((exercise) => {
        if (exercise.description.trim().length < 120) {
          violations.push(`${label}: "${exercise.name}" no explica suficientemente qué hacer`);
        }

        if (!exercise.notes || exercise.notes.trim().length < 40) {
          violations.push(`${label}: "${exercise.name}" necesita una nota técnica o ajuste`);
        }
      });
    });
  });

  return violations;
}

function getLanguageViolations(plan: TrainingPlan) {
  const text = flattenPlanText(plan);
  const englishPatterns = [
    'warmup',
    'cooldown',
    'workout',
    'training session',
    'climbing gym',
    'rest day',
    'easy pace',
    'moderate pace',
    'sets of',
    'reps of'
  ];

  return englishPatterns
    .filter((pattern) => text.includes(pattern))
    .map((pattern) => `usa texto en inglés: "${pattern}"`);
}

function getSafetyViolations(plan: TrainingPlan, profile: UserProfile) {
  const text = flattenPlanText(plan);
  const violations: string[] = [];
  const isMinor = profile.age === 'u16';
  const isNewerClimber = profile.climbingTime === 'start' || profile.climbingTime === 'less1';
  const hasInjury =
    profile.injuries.some((injury) => injury !== 'none') ||
    Boolean(profile.injuryDescription.trim() || profile.injuryNotes.trim());
  const fingerLoadPatterns = ['hangboard', 'fingerboard', 'campus', 'maxhang', 'colgadas'];
  const weightPatterns = ['mancuerna', 'mancuernas', 'barra con peso', 'kettlebell', 'pesas'];

  if ((isMinor || isNewerClimber) && fingerLoadPatterns.some((pattern) => text.includes(pattern))) {
    violations.push('incluye carga avanzada de dedos para menor o escalador principiante');
  }

  if (isMinor && weightPatterns.some((pattern) => text.includes(pattern))) {
    violations.push('incluye pesas para perfil menor de 16 años');
  }

  if (hasInjury && !text.includes('fisio') && !text.includes('fisioterapeuta')) {
    violations.push('hay lesión/molestia y el plan no indica consultar a fisio');
  }

  const longestSession = Math.max(
    ...plan.weeks.flatMap((week) => week.sessions.map((session) => session.estimatedMinutes)),
    0
  );

  if (profile.sessionDuration > 0 && longestSession > profile.sessionDuration + 15) {
    violations.push(
      `incluye sesiones de hasta ${longestSession} min aunque el perfil reporta ${profile.sessionDuration} min`
    );
  }

  return violations;
}

function getPlanValidationViolations(plan: TrainingPlan, profile: UserProfile) {
  return [
    ...getLanguageViolations(plan),
    ...getUnavailableEquipmentViolations(plan, profile),
    ...getDetailViolations(plan),
    ...getSafetyViolations(plan, profile)
  ];
}

function toExercise(exercise: ExerciseDraft): TrainingPlan['weeks'][number]['sessions'][number]['warmup'][number] {
  return {
    sets: exercise.sets ?? null,
    reps: exercise.reps ?? null,
    rest: exercise.rest ?? null,
    intensity: exercise.intensity ?? null,
    timerSeconds: exercise.timerSeconds ?? null,
    ...exercise
  };
}

function makeWarmupExercises(profile: UserProfile) {
  const hasBands = profile.equipment.includes('bands');

  return [
    toExercise({
      name: 'Movilidad general de hombros y cadera',
      description:
        'Haz círculos controlados de hombros, muñecas, cadera y tobillos. Mantén respiración nasal suave y aumenta el rango poco a poco sin rebotes ni dolor.',
      reps: '6 a 8 repeticiones por dirección',
      rest: 'Sin descanso largo',
      intensity: 'Muy suave',
      notes:
        'Debe sentirse como lubricación articular, no como estiramiento intenso. Si algo pincha, reduce rango.',
      objective: 'Subir temperatura y preparar articulaciones para moverse con control.',
      howTo: [
        'Empieza por cuello, hombros y muñecas',
        'Sigue con cadera, rodillas y tobillos',
        'Usa rango cómodo y lento'
      ],
      feelCues: ['Calor ligero', 'Respiración tranquila', 'Movimiento más fluido'],
      commonMistakes: ['Rebotar', 'Forzar rango', 'Mover rápido sin control'],
      stopIf: ['Dolor punzante', 'Mareo', 'Hormigueo'],
      alternative: 'Camina 5 minutos y repite solo las articulaciones que se sientan rígidas.',
      equipment: 'sin equipo'
    }),
    toExercise({
      name: hasBands ? 'Aperturas de dedos con banda' : 'Aperturas activas de dedos',
      description: hasBands
        ? 'Coloca una banda ligera alrededor de los dedos y abre la mano de forma lenta. Vuelve al centro controlando la banda sin cerrar con fuerza.'
        : 'Abre y cierra los dedos lentamente, separándolos lo más posible sin tensión. Mantén muñeca neutra y hombros relajados.',
      sets: 2,
      reps: '12 a 15 repeticiones',
      rest: '30 segundos',
      intensity: 'Suave',
      notes:
        'Busca activar extensores y antebrazo sin fatigar. Si los dedos duelen, baja tensión o hazlo sin banda.',
      objective: 'Activar extensores de dedos y equilibrar la carga de agarre.',
      howTo: ['Muñeca neutra', 'Abre dedos lento', 'Regresa sin golpear la banda'],
      feelCues: ['Trabajo leve en dorso de mano', 'Antebrazo despierto', 'Cero dolor articular'],
      commonMistakes: ['Usar banda muy dura', 'Doblar la muñeca', 'Ir al fallo'],
      stopIf: ['Dolor de dedos sube a 3/10', 'Dolor punzante', 'Pérdida de control'],
      alternative: 'Haz aperturas sin banda o masaje suave de antebrazo.',
      equipment: hasBands ? 'bandas elásticas' : 'sin equipo'
    }),
    toExercise({
      name: 'Activación escapular de pie',
      description:
        'De pie, lleva hombros suavemente hacia atrás y abajo, como si guardaras las escápulas en los bolsillos. Mantén costillas bajas y cuello largo.',
      sets: 2,
      reps: '8 a 10 repeticiones',
      rest: '30 segundos',
      intensity: 'Suave a moderada',
      notes:
        'No arquees la espalda para juntar escápulas. El movimiento debe sentirse estable y limpio.',
      objective: 'Preparar hombros para tracción y estabilidad en roca o barra.',
      howTo: ['Pies firmes', 'Costillas abajo', 'Escápulas atrás y abajo'],
      feelCues: ['Espalda alta activa', 'Cuello relajado', 'Hombros estables'],
      commonMistakes: ['Encoger hombros', 'Arquear lumbar', 'Apretar mandíbula'],
      stopIf: ['Dolor anterior de hombro', 'Hormigueo', 'Pérdida de control'],
      alternative: 'Hazlo acostado boca arriba si de pie cuesta controlar costillas.',
      equipment: 'sin equipo'
    })
  ];
}

function makeMainExercises(profile: UserProfile, weekNumber: number, sessionIndex: number) {
  const hasRock = profile.equipment.includes('rock');
  const hasPullupBar = profile.equipment.includes('pullup_bar');
  const hasBands = profile.equipment.includes('bands');
  const fingerPainContext =
    profile.injuries.includes('fingers') || profile.injuryDescription.toLowerCase().includes('dedo');

  if (hasRock && sessionIndex === 0) {
    return [
      toExercise({
        name: 'Escalada en roca con foco técnico',
        description:
          'Elige rutas dos grados por debajo de tu máximo y escala priorizando pies silenciosos, cadera cerca de la pared y respiración. Descansa antes de perder técnica.',
        sets: 4,
        reps: '1 ruta o tramo por serie',
        rest: '3 a 5 minutos',
        intensity: 'RPE 5 a 6/10',
        notes:
          'La meta no es encadenar al límite; es acumular metros de calidad con movimientos repetibles.',
        objective: 'Mejorar eficiencia técnica y resistencia específica sin depender de muro indoor.',
        howTo: ['Escoge rutas cómodas', 'Mira pies antes de mover manos', 'Baja si la técnica se rompe'],
        feelCues: ['Respiración estable', 'Antebrazos cargan poco a poco', 'Pies precisos'],
        commonMistakes: ['Apretar de más', 'Subir intensidad muy pronto', 'Saltar descansos'],
        stopIf: ['Dolor de dedos aumenta', 'Técnica se desordena', 'Fatiga impide chapar seguro'],
        alternative: 'Si no puedes ir a roca, haz visualización de secuencias y movilidad en casa.',
        equipment: 'roca'
      }),
      toExercise({
        name: 'Lectura de ruta y descansos',
        description:
          'Antes de subir, identifica tres posiciones de descanso y dos secciones clave. En la ruta, practica relajar manos y respirar en cada descanso elegido.',
        sets: 3,
        reps: '1 lectura + 1 intento controlado',
        rest: '4 minutos',
        intensity: 'Técnica, RPE 4 a 5/10',
        notes:
          'Anota después qué descanso funcionó y cuál no. Esa bitácora vuelve el plan más específico.',
        objective: 'Convertir la escalada en roca en práctica deliberada, no solo volumen.',
        howTo: ['Observa desde el suelo', 'Marca descansos', 'Prueba una decisión por intento'],
        feelCues: ['Más calma', 'Mejor memoria de secuencia', 'Menos bombeo innecesario'],
        commonMistakes: ['Salir sin plan', 'Escalar siempre al límite', 'Ignorar pies buenos'],
        stopIf: ['Miedo altera decisiones', 'Fatiga alta', 'Condiciones inseguras'],
        alternative: 'Dibuja la ruta o describe la secuencia si no puedes escalar ese día.',
        equipment: 'roca'
      })
    ];
  }

  return [
    toExercise({
      name: hasPullupBar ? 'Suspensión asistida en barra' : 'Remo escapular sin equipo',
      description: hasPullupBar
        ? 'Sujeta una barra con pies apoyados en el suelo o una silla para descargar peso. Mantén hombros activos y sostén sin llegar al fallo.'
        : 'Inclínate ligeramente, activa escápulas hacia atrás y abajo, y simula una tracción lenta manteniendo abdomen firme.',
      sets: 3,
      reps: hasPullupBar ? '8 a 12 segundos' : '10 repeticiones lentas',
      rest: '90 segundos',
      intensity: fingerPainContext ? 'Submáxima, RPE 4/10' : 'Moderada, RPE 5 a 6/10',
      notes:
        'Evita agarre arqueado máximo y cualquier intento al fallo. Debe sentirse controlado y repetible.',
      objective: 'Construir base de tracción y estabilidad sin cargas máximas de dedos.',
      howTo: ['Apoya pies', 'Activa escápulas', 'Suelta antes de perder forma'],
      feelCues: ['Espalda activa', 'Hombros firmes', 'Dedos sin dolor agudo'],
      commonMistakes: ['Colgar pasivo', 'Apretar al máximo', 'Contener la respiración'],
      stopIf: ['Dolor de dedos sube a 3/10', 'Dolor punzante', 'Hombro se siente inestable'],
      alternative: 'Cambia por activación escapular y extensores con banda.',
      equipment: hasPullupBar ? 'barra de dominadas' : 'sin equipo'
    }),
    toExercise({
      name: hasBands ? 'Extensores de dedos con banda' : 'Plancha frontal técnica',
      description: hasBands
        ? 'Usa una banda suave y abre los dedos manteniendo muñeca neutra. Pausa un segundo abierto y regresa lento para trabajar control.'
        : 'Apoya antebrazos, aprieta abdomen y glúteos, y mantén una línea larga de cabeza a talones sin hundir la cadera.',
      sets: 3,
      reps: hasBands ? '12 repeticiones' : '20 a 30 segundos',
      rest: '60 segundos',
      intensity: 'Suave a moderada',
      notes:
        'Termina con sensación de activación, no fatiga profunda. Este bloque debe ayudar a recuperar, no irritar.',
      objective: hasBands
        ? 'Dar trabajo antagonista a dedos y antebrazo para tolerar mejor la carga de escalada.'
        : 'Mejorar tensión corporal para que pies y cadera trabajen mejor en roca.',
      howTo: hasBands
        ? ['Banda ligera', 'Abre dedos lento', 'Pausa un segundo']
        : ['Codos bajo hombros', 'Costillas abajo', 'Respira sin perder línea'],
      feelCues: hasBands
        ? ['Dorso de mano activo', 'Cero dolor', 'Antebrazo ligero']
        : ['Abdomen activo', 'Glúteos firmes', 'Respiración posible'],
      commonMistakes: hasBands
        ? ['Banda muy pesada', 'Doblar muñeca', 'Ir rápido']
        : ['Cadera hundida', 'Cuello tenso', 'Aguantar aire'],
      stopIf: ['Dolor punzante', 'Técnica se rompe', 'Fatiga cambia el movimiento'],
      alternative: 'Reduce repeticiones o cambia por respiración diafragmática.',
      equipment: hasBands ? 'bandas elásticas' : 'sin equipo'
    })
  ];
}

function makeCooldownExercises() {
  return [
    toExercise({
      name: 'Respiración y vuelta a la calma',
      description:
        'Acuéstate o siéntate cómodo y respira lento por la nariz. Al exhalar, relaja manos, antebrazos, hombros y mandíbula durante varios ciclos.',
      reps: '3 a 5 minutos',
      rest: 'Sin descanso',
      intensity: 'Muy suave',
      notes:
        'Debe bajar pulsaciones y tensión. Si la mente se acelera, cuenta exhalaciones largas.',
      objective: 'Bajar activación del sistema nervioso y favorecer recuperación.',
      howTo: ['Inhala por nariz', 'Exhala más largo', 'Relaja manos y hombros'],
      feelCues: ['Pulso baja', 'Manos menos tensas', 'Respiración amplia'],
      commonMistakes: ['Apurarlo', 'Mirar el celular', 'Forzar aire'],
      stopIf: ['Mareo', 'Ansiedad aumenta', 'Dolor raro'],
      alternative: 'Camina suave 5 minutos.',
      equipment: 'sin equipo'
    }),
    toExercise({
      name: 'Movilidad suave de antebrazo y hombro',
      description:
        'Haz estiramientos suaves de flexores de muñeca, extensores y pecho. Mantén cada posición cómoda, sin buscar máximo rango ni dolor.',
      reps: '30 segundos por posición',
      rest: '15 segundos',
      intensity: 'Suave',
      notes:
        'La sensación debe ser de descarga. Si aparece dolor de dedos u hombro, reduce rango inmediatamente.',
      objective: 'Cerrar la sesión con movilidad ligera y señales de recuperación.',
      howTo: ['Muñeca neutra', 'Estira suave', 'Respira lento'],
      feelCues: ['Tensión baja', 'Rango cómodo', 'Sin dolor articular'],
      commonMistakes: ['Forzar dedos', 'Rebotar', 'Buscar dolor'],
      stopIf: ['Dolor de dedos sube', 'Hormigueo', 'Dolor punzante'],
      alternative: 'Masaje suave de antebrazo con la otra mano.',
      equipment: 'sin equipo'
    })
  ];
}

function buildFallbackPlan(profile: UserProfile, libraryTraceability?: LibraryTraceability): TrainingPlan {
  const now = new Date().toISOString();
  const sessionCount = Math.max(1, Math.min(profile.daysPerWeek || 3, 5));
  const totalWeeks = Math.max(1, profile.planDuration || 4);

  return {
    id: crypto.randomUUID(),
    profileId: profile.id,
    objective:
      profile.goalDescription ||
      'Construir una base segura de técnica, resistencia y fuerza general para escalar mejor.',
    totalWeeks,
    currentWeek: 1,
    startDate: now,
    status: 'active',
    createdAt: now,
    usedFileSearch: libraryTraceability?.usedFileSearch ?? false,
    librarySources: libraryTraceability?.sourceNames ?? [],
    weeks: Array.from({ length: totalWeeks }, (_, weekIndex) => {
      const weekNumber = weekIndex + 1;
      const isDownloadWeek = weekNumber % 4 === 0;

      return {
        weekNumber,
        theme: isDownloadWeek
          ? `Semana ${weekNumber}: descarga técnica y recuperación`
          : `Semana ${weekNumber}: técnica en roca y base física`,
        focusAreas: isDownloadWeek
          ? ['recuperación', 'técnica suave', 'movilidad']
          : ['técnica de pies', 'resistencia submáxima', 'prevención de lesiones'],
        sessions: Array.from({ length: sessionCount }, (_, sessionIndex) => {
          const rawDay = profile.availableDays[sessionIndex];
          const dayLabel = rawDay
            ? DAY_LABELS[rawDay] ?? rawDay
            : DAYS_BY_COUNT[sessionIndex] ?? `Día ${sessionIndex + 1}`;
          const hasRock = profile.equipment.includes('rock');
          const location = hasRock && sessionIndex === 0 ? 'roca' : 'casa';

          return {
            dayNumber: sessionIndex + 1,
            title:
              location === 'roca'
                ? `${dayLabel}: técnica y resistencia en roca`
                : `${dayLabel}: fuerza base y movilidad en casa`,
            location,
            estimatedMinutes: Math.min(Math.max(profile.sessionDuration || 75, 45), 120),
            warmup: makeWarmupExercises(profile),
            mainBlock: makeMainExercises(profile, weekNumber, sessionIndex),
            cooldown: makeCooldownExercises(),
            nutritionTip:
              'Come algo ligero con carbohidratos 60 a 90 minutos antes y toma agua durante la sesión.',
            source:
              'Plan de respaldo BilClimb: principios de periodización, carga submáxima y prevención de lesiones.',
            completed: false,
            checkIn: null
          };
        })
      };
    })
  };
}

function shouldUseFastPlanBuilder(profile: UserProfile) {
  return (profile.planDuration || 4) * (profile.daysPerWeek || 3) > MAX_STRUCTURED_SESSIONS;
}

async function getLibraryTraceabilityForPlan({
  client,
  profile,
  vectorStoreId
}: {
  client: OpenAI;
  profile: UserProfile;
  vectorStoreId: string;
}) {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    max_output_tokens: 700,
    input: [
      {
        role: 'system',
        content:
          'Eres BilClimb.ai. Consulta la biblioteca con file_search y devuelve solo principios breves de entrenamiento seguro para construir un plan. No incluyas chunks raw.'
      },
      {
        role: 'user',
        content: `Perfil resumido: ${JSON.stringify({
          climbingTime: profile.climbingTime,
          level: profile.level,
          goals: profile.goals,
          goalDescription: profile.goalDescription,
          equipment: profile.equipment,
          injuries: profile.injuries,
          injuryDescription: profile.injuryDescription,
          daysPerWeek: profile.daysPerWeek,
          sessionDuration: profile.sessionDuration
        })}`
      }
    ],
    tools: [
      {
        type: 'file_search',
        vector_store_ids: [vectorStoreId]
      }
    ]
  });

  return extractLibraryTraceability(response);
}

async function generatePlanWithResponses({
  client,
  profile,
  vectorStoreId,
  validationHints
}: {
  client: OpenAI;
  profile: UserProfile;
  vectorStoreId: string;
  validationHints: string[];
}) {
  const correctionPrompt = validationHints.length
    ? `\n\nCORRECCIONES OBLIGATORIAS PARA ESTE REINTENTO:\n${validationHints
        .map((hint) => `- ${hint}`)
        .join('\n')}`
    : '';

  return client.responses.parse({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    max_output_tokens: PLAN_MAX_OUTPUT_TOKENS,
    input: [
      {
        role: 'system',
        content:
          'Eres BilClimb.ai. Genera planes de entrenamiento seguros, personalizados, basados en evidencia y estructurados para escaladores. Antes de generar el JSON, usa file_search para consultar la biblioteca de BilClimb. Responde todos los campos de texto en español mexicano y respeta estrictamente el equipo disponible del usuario.'
      },
      {
        role: 'user',
        content: `${buildPlanGeneratorPrompt(profile)}

REGLA DE TAMAÑO:
- Genera un JSON completo pero compacto.
- Mantén cada descripción en 1 o 2 frases accionables.
- Mantén cada array visual con máximo 3 bullets.
- No agregues explicaciones fuera del JSON.${correctionPrompt}`
      }
    ],
    tools: [
      {
        type: 'file_search',
        vector_store_ids: [vectorStoreId]
      }
    ],
    text: {
      format: zodTextFormat(TrainingPlanSchema, 'training_plan')
    }
  });
}

export async function POST(request: Request) {
  const subscriptionError = requireSubscriptionAccess();

  if (subscriptionError) {
    return subscriptionError;
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is required to generate a training plan.' },
      { status: 500 }
    );
  }

  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

  if (!vectorStoreId) {
    return NextResponse.json(
      { error: 'OPENAI_VECTOR_STORE_ID is required to generate grounded training plans.' },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { profile?: unknown };

  if (!isUserProfile(body.profile)) {
    return NextResponse.json({ error: 'A valid UserProfile is required.' }, { status: 400 });
  }

  const profile = body.profile;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    let validationHints: string[] = [];
    let lastLibraryTraceability: LibraryTraceability | undefined;

    if (shouldUseFastPlanBuilder(profile)) {
      const libraryTraceability = await getLibraryTraceabilityForPlan({
        client,
        profile,
        vectorStoreId
      });
      const plan = buildFallbackPlan(profile, libraryTraceability);

      return NextResponse.json({ plan, fallback: true });
    }

    for (let attempt = 1; attempt <= MAX_PLAN_GENERATION_ATTEMPTS; attempt += 1) {
      const response = await generatePlanWithResponses({
        client,
        profile,
        vectorStoreId,
        validationHints
      });

      const libraryTraceability = extractLibraryTraceability(response);
      lastLibraryTraceability = libraryTraceability.usedFileSearch
        ? libraryTraceability
        : lastLibraryTraceability;

      if (!response.output_parsed) {
        validationHints = [
          'OpenAI no devolvió un plan estructurado compatible con el schema; genera un JSON más compacto y completo.'
        ];
        break;
      }

      const plan = normalizePlan(response.output_parsed, profile, libraryTraceability);
      const validationViolations = getPlanValidationViolations(plan, profile);

      if (!validationViolations.length) {
        return NextResponse.json({ plan });
      }

      validationHints = validationViolations.slice(0, 8);
    }

    const fallbackPlan = buildFallbackPlan(profile, lastLibraryTraceability);
    const fallbackViolations = getPlanValidationViolations(fallbackPlan, profile);

    if (!fallbackViolations.length) {
      return NextResponse.json({ plan: fallbackPlan, fallback: true });
    }

    return NextResponse.json({
      plan: fallbackPlan,
      fallback: true,
      warning: `El plan de OpenAI no pasó validación completa: ${validationHints
        .slice(0, 5)
        .join('; ')}. Se generó un plan seguro de respaldo.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate plan.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
