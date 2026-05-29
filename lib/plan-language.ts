import type { Exercise, Session, TrainingPlan, Week } from '@/lib/plan';

const exactTranslations: Record<string, string> = {
  'technique and body control': 'Técnica y control corporal',
  'body control': 'Control corporal',
  technique: 'Técnica',
  'dynamic warm-up': 'Calentamiento dinámico',
  'dynamic warmup': 'Calentamiento dinámico',
  'warm-up': 'Calentamiento',
  warmup: 'Calentamiento',
  'main block': 'Bloque principal',
  cooldown: 'Vuelta a la calma',
  'cool-down': 'Vuelta a la calma',
  'climbing gym': 'Gimnasio de escalada',
  gym: 'Gimnasio de escalada',
  none: 'sin descanso',
  low: 'baja',
  medium: 'media',
  moderate: 'moderada',
  high: 'alta',
  hard: 'difícil',
  easy: 'suave',
  '10 each': '10 por lado',
  'preparation for climbing and falling': 'Preparación para escalar y caer con control',
  'include high knees, butt kicks, and arm swings':
    'Incluye elevaciones de rodillas, talones a glúteos y balanceos de brazos'
};

const phraseTranslations: Array<[RegExp, string]> = [
  [/\btechnique and body control\b/gi, 'técnica y control corporal'],
  [/\bbody control\b/gi, 'control corporal'],
  [/\btechnique\b/gi, 'técnica'],
  [/\bdynamic warm-?up\b/gi, 'calentamiento dinámico'],
  [/\bwarm-?up\b/gi, 'calentamiento'],
  [/\bcool-?down\b/gi, 'vuelta a la calma'],
  [/\bmain block\b/gi, 'bloque principal'],
  [/\bclimbing gym\b/gi, 'gimnasio de escalada'],
  [/\brest day\b/gi, 'día de descanso'],
  [/\brest\b/gi, 'descanso'],
  [/\breps\b/gi, 'repeticiones'],
  [/\beach\b/gi, 'por lado'],
  [/\binclude\b/gi, 'incluye'],
  [/\bhigh knees\b/gi, 'elevaciones de rodillas'],
  [/\bbutt kicks\b/gi, 'talones a glúteos'],
  [/\barm swings\b/gi, 'balanceos de brazos'],
  [/\bpreparation for climbing and falling\b/gi, 'preparación para escalar y caer con control'],
  [/\bclimbing\b/gi, 'escalada'],
  [/\bfalling\b/gi, 'caídas'],
  [/\blow intensity\b/gi, 'intensidad baja'],
  [/\bmoderate intensity\b/gi, 'intensidad moderada'],
  [/\bhigh intensity\b/gi, 'intensidad alta'],
  [/\blow\b/gi, 'baja'],
  [/\bmedium\b/gi, 'media'],
  [/\bmoderate\b/gi, 'moderada'],
  [/\bhigh\b/gi, 'alta']
];

function normalizeKey(value: string) {
  return value.trim().replace(/[–—]/g, '-').replace(/\s+/g, ' ').toLowerCase();
}

function preserveSentenceCase(original: string, translated: string) {
  const trimmed = original.trim();

  if (!trimmed) {
    return translated;
  }

  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }

  if (/^[A-ZÁÉÍÓÚÑ]/.test(trimmed)) {
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }

  return translated;
}

export function translateTrainingText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return value ?? null;
  }

  const exact = exactTranslations[normalizeKey(value)];

  if (exact) {
    return exact;
  }

  let translated = value;

  phraseTranslations.forEach(([pattern, replacement]) => {
    translated = translated.replace(pattern, replacement);
  });

  return preserveSentenceCase(value, translated).replace(/\s+/g, ' ').trim();
}

function translateStringArray(values: string[] | null | undefined) {
  if (!Array.isArray(values)) {
    return values ?? null;
  }

  return values.map((value) => translateTrainingText(value) ?? value);
}

function normalizeExerciseLanguage(exercise: Exercise): Exercise {
  return {
    ...exercise,
    name: translateTrainingText(exercise.name) ?? exercise.name,
    description: translateTrainingText(exercise.description) ?? exercise.description,
    reps: translateTrainingText(exercise.reps),
    rest: translateTrainingText(exercise.rest),
    intensity: translateTrainingText(exercise.intensity),
    notes: translateTrainingText(exercise.notes),
    objective: translateTrainingText(exercise.objective),
    howTo: translateStringArray(exercise.howTo),
    feelCues: translateStringArray(exercise.feelCues),
    commonMistakes: translateStringArray(exercise.commonMistakes),
    stopIf: translateStringArray(exercise.stopIf),
    alternative: translateTrainingText(exercise.alternative),
    equipment: translateTrainingText(exercise.equipment)
  };
}

function normalizeSessionLanguage(session: Session): Session {
  return {
    ...session,
    title: translateTrainingText(session.title) ?? session.title,
    location: translateTrainingText(session.location) ?? session.location,
    nutritionTip: translateTrainingText(session.nutritionTip) ?? session.nutritionTip,
    source: translateTrainingText(session.source) ?? session.source,
    warmup: session.warmup.map(normalizeExerciseLanguage),
    mainBlock: session.mainBlock.map(normalizeExerciseLanguage),
    cooldown: session.cooldown.map(normalizeExerciseLanguage)
  };
}

function normalizeWeekLanguage(week: Week): Week {
  return {
    ...week,
    theme: translateTrainingText(week.theme) ?? week.theme,
    focusAreas: week.focusAreas.map((focus) => translateTrainingText(focus) ?? focus),
    sessions: week.sessions.map(normalizeSessionLanguage)
  };
}

export function normalizePlanLanguage(plan: TrainingPlan): TrainingPlan {
  return {
    ...plan,
    objective: translateTrainingText(plan.objective) ?? plan.objective,
    weeks: plan.weeks.map(normalizeWeekLanguage)
  };
}
