// Monitoreo NO bloqueante: detecta ejercicios sospechosos de mal-etiquetado
// de blockCategory en perfiles con bloqueos de §1.1/§1.2.
//
// CONTEXTO — por qué esto NO bloquea ni dispara retry:
//   La combinación (stimulusCategory ∈ {strength, power}, riskLevel='alto',
//   blockCategory=null) coincide TANTO con:
//     - Ejercicios legítimos y prescritos para menores (front lever,
//       muscle-up, dominadas BW max, compound BW).
//     - Ejercicios prohibidos mal-etiquetados por el LLM (max hang
//       marcado con blockCategory=null).
//   Sin un campo `loadsFingersDirectly` para separarlos, un chequeo
//   bloqueante sobre esta combinación tendría 5-10 falsos positivos por
//   real (análisis Giuliana + Claude, 2026-07-07). Preferimos log-only:
//   con 2-4 semanas de prod tenemos datos para decidir si vale agregar
//   `loadsFingersDirectly` al schema o refinar el prompt.
//
// USO:
//   El caller emite cada evento devuelto como JSON estructurado a stdout
//   (mismo canal que ConsoleLogSink). No retorna PlanViolation — el flujo
//   de generación no ve estos eventos.

import { evaluateProfile } from '../validator';
import type {
  BlockedCategory,
  PlanForRules,
  PlanSessionForRules,
  ProfileForRules
} from '../types';

// Categorías estructurales que combinadas con riskLevel='alto' y
// blockCategory=null forman la señal de sospecha.
const SUSPECT_STIMULI = new Set(['strength', 'power'] as const);

export type LowConfidenceBlockCategoryEvent = {
  kind: 'low-confidence-block-category';
  /** Bucket de edad del perfil (u16 / 16-25 / 26-35 / etc). Empty si no seteado. */
  profileAge: string;
  /** Bucket de años escalando del perfil. */
  profileClimbingTime: string;
  /** Nombre del exercise. */
  exerciseName: string;
  /** Confirmación del stimulus sospechoso (strength o power). */
  stimulusCategory: string;
  /** Siempre 'alto' cuando el evento dispara. */
  riskLevel: string;
  /** Siempre null cuando el evento dispara (por definición del pattern). */
  blockCategory: null;
  /** Set de BlockedCategory activas en el perfil, aporta contexto para el
   *  análisis futuro (ej: si u16 tiene 'hangboard' y 'campus' bloqueadas). */
  activeProfileBlocks: BlockedCategory[];
  /** Localización dentro del plan para poder ir al ejercicio. */
  location: {
    weekNumber: number;
    dayNumber: number;
    block: 'warmup' | 'mainBlock' | 'cooldown';
    exerciseIndex: number;
  };
};

/**
 * Devuelve la lista de eventos de baja confianza. NUNCA dispara verdicts,
 * NUNCA bloquea generación. El caller emite cada evento a stdout como JSON.
 *
 * Fallback: si el perfil no tiene ningún bloqueo activo (§1.1/§1.2 no
 * dispararon), NO se emiten eventos aunque haya combinaciones sospechosas
 * — el pattern solo importa cuando hay bloqueos por edad/años.
 */
export function detectLowConfidenceBlockCategory(
  plan: PlanForRules,
  profile: ProfileForRules
): LowConfidenceBlockCategoryEvent[] {
  const ctx = evaluateProfile(profile);
  if (ctx.blockedCategories.size === 0) return [];

  const activeBlocks = Array.from(ctx.blockedCategories);
  const events: LowConfidenceBlockCategoryEvent[] = [];

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      const emit = (
        blockName: 'warmup' | 'mainBlock' | 'cooldown',
        list: NonNullable<PlanSessionForRules['warmup']>
      ) => {
        for (let i = 0; i < list.length; i++) {
          const ex = list[i];
          if (!ex) continue;
          if (ex.blockCategory != null) continue; // ya etiquetado, no aplica
          if (ex.riskLevel !== 'alto') continue;
          if (!ex.stimulusCategory) continue;
          if (!SUSPECT_STIMULI.has(ex.stimulusCategory as never)) continue;
          events.push({
            kind: 'low-confidence-block-category',
            profileAge: profile.age,
            profileClimbingTime: profile.climbingTime,
            exerciseName: ex.name ?? '(unnamed)',
            stimulusCategory: ex.stimulusCategory,
            riskLevel: ex.riskLevel,
            blockCategory: null,
            activeProfileBlocks: activeBlocks,
            location: {
              weekNumber: week.weekNumber,
              dayNumber: session.dayNumber,
              block: blockName,
              exerciseIndex: i
            }
          });
        }
      };
      if (session.warmup) emit('warmup', session.warmup);
      if (session.mainBlock) emit('mainBlock', session.mainBlock);
      if (session.cooldown) emit('cooldown', session.cooldown);
    }
  }
  return events;
}
