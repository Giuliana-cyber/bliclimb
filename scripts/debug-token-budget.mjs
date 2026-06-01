import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function parseConstant(source, name, fallback) {
  const match = source.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
  return match ? Number(match[1]) : fallback;
}

const budgetSource = read('lib/ai/token-budget.ts');
const catalogSource = read('lib/planning/exercise-catalog.ts');
const skeletonSource = read('lib/planning/build-plan-skeleton.ts');
const routeSource = read('app/api/generate-plan/route.ts');

const catalogSize = (catalogSource.match(/\bid:\s*['"]/g) ?? []).length;
const candidateLimit = parseConstant(
  budgetSource,
  'MAX_EXERCISE_CANDIDATES_PER_SESSION',
  12
);
const sessionsPerWeek = 3;
const totalWeeks = 4;
const compactCandidate = {
  id: 'tecnica-pies',
  name: 'Técnica de pies',
  category: 'tecnica',
  equipment: [],
  risk: 'bajo',
  objective: 'Mejorar precisión y transferencia de peso.',
  dose: '4 x 3-5 minutos',
  rest: '2-3 minutos',
  howTo: ['Mira el apoyo.', 'Pisa silencioso.'],
  stopIf: ['Dolor aumenta.', 'Fatiga cambia la técnica.'],
  regressions: ['Practica sobre una línea en el piso.'],
  sourceConcept: 'Economía técnica: pies y cadera reducen carga de antebrazo.'
};
const compactWeek = {
  weekNumber: 1,
  microcycleId: 'mc-1-base',
  objective: 'Construir base técnica, tolerancia de tejidos y hábitos de registro.',
  progressionFocus: 'Control técnico y volumen submáximo.',
  loadLevel: 'base',
  deloadWeek: false,
  sessions: Array.from({ length: sessionsPerWeek }, (_, index) => ({
    dayNumber: index + 1,
    stimulusType: ['tecnica_pies', 'fuerza_general', 'movilidad_recuperacion'][index],
    location: index === 0 ? 'roca' : 'casa',
    estimatedDurationMinutes: 75,
    candidateExerciseIds: Array.from({ length: candidateLimit }, (__, candidateIndex) => `ej-${candidateIndex + 1}`),
    exerciseCandidates: Array.from({ length: candidateLimit }, () => compactCandidate),
    restrictions: ['No cambiar stimulusType.', 'No usar equipo no disponible.'],
    successCriteria: ['Técnica limpia.', 'Dolor no sube.'],
    adjustmentRules: ['Reduce una serie si RPE sube.', 'Cambia a movilidad si dolor sube.'],
    safetyNotes: ['No entrenar al fallo.']
  }))
};

const compactPrompt = [
  'Prompt compacto BilClimb',
  'Perfil analizado, plantilla seleccionada y skeleton por semana.',
  JSON.stringify(compactWeek)
].join('\n');
const estimatedPromptChars = compactPrompt.length;
const estimatedPromptTokens = Math.ceil(estimatedPromptChars / 4);
const sendsFullCatalog =
  routeSource.includes('JSON.stringify(allowedExercises, null, 2)') ||
  routeSource.includes('JSON.stringify(EXERCISE_CATALOG');
const usesCandidateLimit =
  skeletonSource.includes('PLAN_SKELETON_CANDIDATE_LIMIT') &&
  skeletonSource.includes('.slice(0, PLAN_SKELETON_CANDIDATE_LIMIT)');

console.log('MODEL:', process.env.OPENAI_MODEL ?? 'gpt-4o-mini');
console.log('ESTIMATED_PROMPT_CHARS_PER_WEEK:', estimatedPromptChars);
console.log('ESTIMATED_PROMPT_TOKENS_PER_WEEK:', estimatedPromptTokens);
console.log('CATALOG_SIZE:', catalogSize);
console.log('MAX_CANDIDATES_PER_SESSION:', candidateLimit);
console.log('CANDIDATES_SENT_PER_WEEK_ESTIMATE:', sessionsPerWeek * candidateLimit);
console.log('SENDS_FULL_CATALOG:', sendsFullCatalog ? 'yes' : 'no');
console.log('USES_CANDIDATE_LIMIT:', usesCandidateLimit ? 'yes' : 'no');
console.log('MAX_OUTPUT_TOKENS:', {
  chat: parseConstant(budgetSource, 'CHAT_MAX_OUTPUT_TOKENS', 1200),
  planSkeleton: parseConstant(budgetSource, 'PLAN_SKELETON_MAX_OUTPUT_TOKENS', 3000),
  planSession: parseConstant(budgetSource, 'PLAN_SESSION_MAX_OUTPUT_TOKENS', 2500),
  planFinal: parseConstant(budgetSource, 'PLAN_FINAL_MAX_OUTPUT_TOKENS', 6000)
});
console.log('OPENAI_CALLS_PER_GENERATION_ESTIMATE:', {
  normal: 1 + totalWeeks,
  note: '1 llamada breve de biblioteca + 1 llamada por semana del plan'
});
