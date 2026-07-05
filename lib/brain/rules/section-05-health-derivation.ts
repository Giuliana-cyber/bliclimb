// Sección 5 del Doc 02 v3 — Reglas de salud y derivación.
//
// Reglas implementadas en sub-fase 3 (reglas de perfil):
//   5.2 Historial de lesión de polea
//   5.3 Historial de epicondilitis / dolor crónico de codo
//   5.4 Sueño y recuperación (<7h)
//
// La regla estrella §3.15 (pérdida de peso) NO vive acá — dispara por
// lenguaje del usuario en chat/route.ts, no por campos del perfil. Se
// diseña como pieza aparte con detección determinística (keywords) + capa
// de intención vía LLM.
//
// Proxy de datos (decisión de Giuliana, sub-fase 3):
//   §5.2 → injuries.includes('fingers')   — "Dedos/manos" del onboarding
//   §5.3 → injuries.includes('elbows')    — "Codos" del onboarding
//   §5.4 → sleep === 'bad'                — SOLO <5 hrs (bucket 'regular'
//                                            no dispara, decisión firme)
//
// Diseño: emite verdicts NO bloqueantes (add-grip-restriction,
// add-training-priority, add-intensity-adjustment). No filtra ejercicios
// del catálogo — son hints/constraints que el consumidor del BlockingContext
// pasa al LLM.

import { SECTION_05_MESSAGES } from '../messages/section-05';
import type { ProfileForRules, RuleModule, Verdict } from '../types';

// -------------------- 5.2 — Historial de lesión de polea --------------------
//
// Trigger: injuries.includes('fingers'). Proxy conservador — el onboarding
// no distingue polea de otras lesiones de dedos/mano. Falso positivo
// aceptable porque §5.2 solo añade restricción de agarre (no bloquea plan).
//
// Acción: añadir GripRestriction 'no-small-crimps-below-15mm'. El
// full-crimp ya lo cubre §1.1 (menores) y viene naturalmente de la
// categoría 'full-crimp' cuando aplica; §5.2 agrega la restricción de
// regletas <15mm.
function check_5_2(profile: ProfileForRules): Verdict | null {
  if (!profile.injuries.includes('fingers')) return null;
  return {
    kind: 'add-grip-restriction',
    rule: '5.2',
    restriction: 'no-small-crimps-below-15mm',
    userMessage: SECTION_05_MESSAGES.pulleyHistory.text,
    source: SECTION_05_MESSAGES.pulleyHistory.source
  };
}

// -------------------- 5.3 — Historial de epicondilitis / dolor crónico de codo --------------------
//
// Trigger: injuries.includes('elbows'). Proxy conservador con falso positivo
// benigno (priorizar extensores le hace bien a todos).
//
// Acción doble:
//   1. Priorizar extensores antes de tracción (TrainingPriority).
//   2. Reducir volumen inicial de dominadas/lock-offs (IntensityAdjustment).
// El mismo verdict.userMessage se emite para ambos — la información es
// idéntica desde la perspectiva del usuario.
function check_5_3(profile: ProfileForRules): Verdict[] {
  if (!profile.injuries.includes('elbows')) return [];
  const base = {
    rule: '5.3',
    userMessage: SECTION_05_MESSAGES.elbowHistory.text,
    source: SECTION_05_MESSAGES.elbowHistory.source
  };
  return [
    {
      ...base,
      kind: 'add-training-priority',
      priority: 'extensors-before-traction'
    },
    {
      ...base,
      kind: 'add-intensity-adjustment',
      adjustment: 'reduce-traction-volume'
    }
  ];
}

// -------------------- 5.4 — Sueño y recuperación --------------------
//
// Trigger: sleep === 'bad' (solo <5h). Decisión firme de Giuliana: el
// bucket 'regular' (5-7h) NO dispara — demasiada gente y no es seguridad
// crítica.
//
// Acción: IntensityAdjustment 'reduce-below-baseline'. Modifica el plan
// global, no bloquea ejercicios.
function check_5_4(profile: ProfileForRules): Verdict | null {
  if (profile.sleep !== 'bad') return null;
  return {
    kind: 'add-intensity-adjustment',
    rule: '5.4',
    adjustment: 'reduce-below-baseline',
    userMessage: SECTION_05_MESSAGES.poorSleep.text,
    source: SECTION_05_MESSAGES.poorSleep.source
  };
}

// -------------------- Módulo exportado --------------------
export const section05HealthDerivation: RuleModule = {
  section: 'section-05',
  ruleIds: ['5.2', '5.3', '5.4'] as const,
  check(profile: ProfileForRules): Verdict[] {
    const out: Verdict[] = [];
    const v52 = check_5_2(profile);
    if (v52) out.push(v52);
    out.push(...check_5_3(profile));
    const v54 = check_5_4(profile);
    if (v54) out.push(v54);
    return out;
  }
};
