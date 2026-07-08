// Derivación de señales de dolor para §1.3 (audit-360 · rediseño lesión).
//
// Producto (turno del 07/07/2026):
//   - El onboarding YA NO captura los 3 dolores por zona
//     (currentFingerPain / currentElbowPain / currentShoulderPain).
//   - Solo se captura dolor de dedos en el check-in post-sesión.
//   - Lesión declarada activa (`injuries` incluye una zona) equivale a
//     dolor 5/10 en esa zona — regla de prioridad max(check-in, lesión ? 5 : 0).
//   - La lesión se desactiva solo cuando la persona la cambia en /profile;
//     el check-in no "cura" la lesión.
//
// Consecuencias:
//   - §1.3 rama fingers-pulleys: usa max(latestCheckIn.fingerPain,
//     injuries.includes('fingers') ? 5 : 0). Compat legacy: si no hay
//     check-in y no hay lesión declarada, cae a profile.currentFingerPain
//     (users pre-cambio).
//   - §1.3 rama codo/hombro: usa solo injuries.includes(...) ? 5 : 0
//     (más el fallback legacy). El check-in no captura estos dolores por
//     decisión de producto — deuda documentada en canonicalization-debt.
//
// Este módulo NO toca lib/brain/rules — solo alimenta los campos
// `currentFingerPain / currentElbowPain / currentShoulderPain` de
// `ProfileForRules` upstream, en `evaluateProfile`/`generate-plan`. La
// regla §1.3 sigue leyendo esos campos idéntico a antes.

const INJURY_EQUIV_PAIN = 5;

type LegacyPainFallback = {
  currentFingerPain?: number | null;
  currentElbowPain?: number | null;
  currentShoulderPain?: number | null;
};

type LatestCheckInMin = { fingerPain?: number | null };

export function deriveFingerPain(
  injuries: readonly string[] | null | undefined,
  latestCheckIn: LatestCheckInMin | null | undefined,
  legacyProfile: LegacyPainFallback | null | undefined
): number {
  const fromInjury = injuries?.includes('fingers') ? INJURY_EQUIV_PAIN : 0;
  const fromCheckIn = latestCheckIn?.fingerPain ?? null;
  const legacyValue = legacyProfile?.currentFingerPain ?? 0;
  // Prioridad: si hay check-in usalo (max con injury); si no hay check-in,
  // fallback a legacy (max con injury). Nunca menor que la señal de lesión.
  if (fromCheckIn !== null && fromCheckIn !== undefined) {
    return Math.max(fromCheckIn, fromInjury);
  }
  return Math.max(legacyValue, fromInjury);
}

export function deriveElbowPain(
  injuries: readonly string[] | null | undefined,
  legacyProfile: LegacyPainFallback | null | undefined
): number {
  const fromInjury = injuries?.includes('elbows') ? INJURY_EQUIV_PAIN : 0;
  const legacyValue = legacyProfile?.currentElbowPain ?? 0;
  return Math.max(legacyValue, fromInjury);
}

export function deriveShoulderPain(
  injuries: readonly string[] | null | undefined,
  legacyProfile: LegacyPainFallback | null | undefined
): number {
  const fromInjury = injuries?.includes('shoulders') ? INJURY_EQUIV_PAIN : 0;
  const legacyValue = legacyProfile?.currentShoulderPain ?? 0;
  return Math.max(legacyValue, fromInjury);
}
