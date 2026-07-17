/**
 * Motor invertido · assembler · Fase 2.
 *
 * Del array de IDs elegidos por el LLM + sets/reps/rest/notes,
 * ensambla la sesión final leyendo del catálogo los campos curados
 * (execution, progression, regression, stop_signals, dosage_notes).
 *
 * El LLM aporta PROGRAMACIÓN (sets, reps, rest, notes personalizadas
 * al atleta). El catálogo aporta CONTENIDO (nombre, cómo se hace,
 * señales para parar, cómo progresar/regresar).
 *
 * El motor invertido nunca escribe execution ni stop_signals — solo lee.
 */

import type { Catalog, PoolRestrictionResult, Profile, FocusObject } from './types';

export interface AssembledExercise {
  exerciseId: string;
  name: string;
  category: string;
  riskLevel: string;
  execution: string;
  progression: string;
  regression: string;
  stopSignals: string;
  equipment: string[];
  gates: string[]; // gate IDs activos para explicar restricciones al usuario
  sets: number;
  reps: string;
  rest: string;
  llmNotes: string;
  sourceTrace: string;
}

export interface AssembledSession {
  title: string;
  rationale: string;
  focus: FocusObject;
  atleta: {
    condicionActual: string;
    tono: 'bill' | 'senda';
  };
  exercises: AssembledExercise[];
  pool: {
    eligibleCount: number;
    blockedCount: number;
    activatedGates: string[];
  };
}

/**
 * Ensambla la sesión final combinando LLM (programación) + catálogo (contenido).
 */
export function assemble(params: {
  llmResponse: {
    sessionTitle: string;
    sessionRationale: string;
    exercises: Array<{
      exerciseId: string;
      sets: number;
      reps: string;
      rest: string;
      notes?: string;
    }>;
  };
  catalog: Catalog;
  poolResult: PoolRestrictionResult;
  profile: Profile;
  focus: FocusObject;
}): AssembledSession {
  const { llmResponse, catalog, poolResult, profile, focus } = params;

  const exercises: AssembledExercise[] = llmResponse.exercises.map((sel) => {
    const ex = catalog.exerciseById.get(sel.exerciseId);
    if (!ex) {
      // Esto NO debería pasar — Zod validó el enum. Si pasa, algo raro.
      throw new Error(
        `assembler · exerciseId ${sel.exerciseId} no está en el catálogo. ` +
          'Fail-closed activado por defensa en profundidad.',
      );
    }
    return {
      exerciseId: ex.id,
      name: ex.name,
      category: ex.category,
      riskLevel: ex.riskLevel,
      execution: ex.executionSummary,
      progression: ex.progression,
      regression: ex.regression,
      stopSignals: ex.stopSignals,
      equipment: ex.equipmentTokens,
      gates: catalog.exerciseGatesById.get(ex.id) ?? [],
      sets: sel.sets,
      reps: sel.reps,
      rest: sel.rest,
      llmNotes: sel.notes ?? '',
      sourceTrace: ex.sourceTrace,
    };
  });

  // Gates activados durante la restricción (info para explicabilidad)
  const activatedGates = Array.from(
    new Set(poolResult.blocked.map((b) => b.gateId)),
  );

  const condicionActual = summarizeCondition(profile);

  return {
    title: llmResponse.sessionTitle,
    rationale: llmResponse.sessionRationale,
    focus,
    atleta: {
      condicionActual,
      tono: profile.character,
    },
    exercises,
    pool: {
      eligibleCount: poolResult.eligible.length,
      blockedCount: poolResult.blocked.length,
      activatedGates,
    },
  };
}

function summarizeCondition(profile: Profile): string {
  const parts: string[] = [];
  if (profile.hang25mmSeconds !== null) {
    parts.push(`colgado 25mm: ${profile.hang25mmSeconds}s`);
  }
  if (profile.maxPullupReps !== null) {
    parts.push(`dominadas: ${profile.maxPullupReps}`);
  }
  if (
    profile.currentFingerPain +
      profile.currentShoulderPain +
      profile.currentElbowPain >
    0
  ) {
    parts.push(
      `dolor F${profile.currentFingerPain}/H${profile.currentShoulderPain}/C${profile.currentElbowPain}`,
    );
  }
  parts.push(`experiencia: ${profile.climbingTime}`);
  return parts.join(' · ');
}
