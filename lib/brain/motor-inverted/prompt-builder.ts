/**
 * Motor invertido · prompt-builder · Fase 2.
 *
 * Genera el prompt corto + Zod schema con `z.enum(elegibleIds)` para el
 * structured output de OpenAI. Es el punto donde se garantiza el
 * fail-closed por construcción: si el LLM devuelve un ID fuera del
 * enum, el structured output falla en generación (no en post-validación).
 */

import { z } from 'zod';
import type { Catalog, Exercise, FocusObject, Profile } from './types';

export interface PromptBuild {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodTypeAny;
  eligibleIds: string[];
}

const PHASE_TONE: Record<string, string> = {
  reconstruccion:
    'Fase de reconstrucción · sin máximos, sin borde mínimo, sin lastre. La condición actual manda, no los años.',
  base: 'Fase de base técnica · fundamentos, volumen moderado.',
  build: 'Fase de progresión · especificidad creciente.',
  peak: 'Fase pico · intensidad máxima con volumen reducido.',
  deload: 'Fase de descarga · ~50% volumen habitual.',
  test: 'Semana de test · evaluaciones estandarizadas.',
  seguridad: 'Fase seguridad · protegemos primero la zona afectada.',
  conservador: 'Plan conservador · empezamos bajo y aprendemos.',
  especifica: 'Fase específica · estímulo alineado al objetivo.',
  complemento: 'Complemento de roca · respetamos la carga externa.',
  'primer-valor': 'Primera sesión · valor concreto hoy.',
};

function buildPoolBlock(exercises: Exercise[], catalog: Catalog): string {
  const lines: string[] = [];
  for (const ex of exercises) {
    const eq = ex.equipmentTokens.join('/') || 'peso corporal';
    lines.push(
      `- ${ex.id} · ${ex.name} · risk=${ex.riskLevel} · equipment=${eq}`,
    );
    void catalog; // silence unused-if-empty
  }
  return lines.join('\n');
}

/**
 * Construye prompt + schema para una sesión de N ejercicios elegidos
 * del pool restringido.
 */
export function buildSlicePrompt(params: {
  catalog: Catalog;
  eligibleIds: string[];
  profile: Profile;
  focus: FocusObject;
  nExercises: number;
  sessionTheme?: string;
}): PromptBuild {
  const { catalog, eligibleIds, profile, focus, nExercises, sessionTheme } = params;
  const eligibleExercises = eligibleIds
    .map((id) => catalog.exerciseById.get(id))
    .filter((e): e is Exercise => Boolean(e));

  const poolBlock = buildPoolBlock(eligibleExercises, catalog);
  const phaseTone = PHASE_TONE[focus.phase] ?? focus.phase;

  const coachName = profile.character === 'senda' ? 'Senda' : 'Bill';

  const systemPrompt = [
    `Sos ${coachName}, coach de escalada de BilClimb.ai.`,
    'Tu misión hoy: diseñar UNA sesión de entrenamiento para este atleta.',
    '',
    'REGLAS DURAS · NO NEGOCIABLES:',
    '1. Solo podés elegir ejercicios cuyos IDs figuren en el POOL PERMITIDO.',
    '   NUNCA inventes IDs, nombres, ni ejercicios nuevos.',
    '2. Devolvés EXACTAMENTE ' + nExercises + ' ejercicios, ni uno más ni uno menos.',
    '3. NO propongas máximos (max hangs, dominadas al fallo, tests máximos automáticos).',
    '4. NO propongas full crimp ni borde mínimo.',
    '5. Sets, reps y descansos van personalizados a la condición actual del atleta.',
    '6. `sessionRationale` explica en 1-2 oraciones por qué esta sesión hoy — voz de coach humano, sin jerga.',
    '',
    'PRINCIPIO RECTOR:',
    '"La condición actual manda, no los años." Aunque el atleta escale hace 10 años, si su capacidad de dedos hoy es baja, reconstruimos desde donde está.',
  ].join('\n');

  const userPrompt = [
    `PERFIL DEL ATLETA:`,
    `- Edad: ${profile.age === 'u16' ? 'menor de 16' : 'adulto'}`,
    `- Tiempo escalando: ${profile.climbingTime}`,
    `- Colgado 25mm: ${profile.hang25mmSeconds ?? 'desconocido'} s`,
    `- Dominadas máximas: ${profile.maxPullupReps ?? 'desconocido'}`,
    `- Dolor actual (dedos/hombro/codo): ${profile.currentFingerPain}/${profile.currentShoulderPain}/${profile.currentElbowPain}`,
    `- Equipo disponible: ${profile.equipment.join(', ')}`,
    ``,
    `ENFOQUE APROBADO:`,
    `- Fase: ${focus.phase}`,
    `- Prioridad primaria: ${focus.primaryPriority}`,
    focus.secondaryPriority
      ? `- Prioridad secundaria: ${focus.secondaryPriority}`
      : '',
    `- Evitar: ${focus.avoid.join(', ')}`,
    `- Tono: ${phaseTone}`,
    ``,
    sessionTheme ? `TEMA DE ESTA SESIÓN: ${sessionTheme}` : '',
    ``,
    `POOL PERMITIDO (elegí ${nExercises} IDs de esta lista):`,
    poolBlock,
    ``,
    'Devuelve la sesión.',
  ]
    .filter(Boolean)
    .join('\n');

  // Zod schema con enum dinámico de IDs elegibles.
  const idEnum = z.enum(eligibleIds as [string, ...string[]]);

  const schema = z.object({
    sessionTitle: z.string().min(3).max(120),
    sessionRationale: z.string().min(20).max(400),
    exercises: z
      .array(
        z.object({
          exerciseId: idEnum,
          sets: z.number().int().positive().max(10),
          reps: z.string().min(1).max(40),
          rest: z.string().min(1).max(60),
          notes: z.string().max(200).optional().default(''),
        }),
      )
      .length(nExercises),
  });

  return { systemPrompt, userPrompt, schema, eligibleIds };
}

export type SliceLlmResponse = z.infer<
  ReturnType<typeof buildSlicePrompt>['schema']
>;
