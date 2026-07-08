// Serialización del UserProfile al texto que el prompt del motor lee.
//
// Vive aparte de `route.ts` porque Next.js App Router prohíbe exports
// arbitrarios desde archivos de ruta (solo GET/POST/handlers HTTP y
// runtime/dynamic/etc). Al mover esta función a un módulo aparte, la
// podemos exportar libremente y consumir tanto desde `route.ts` como
// desde los tests unitarios.
//
// Bloque 4 audit-360: los campos recortados (Estatura, Proyecto,
// Contexto proyecto, Plan anterior, Exp. campus, Frecuencia roca,
// Press banca / Sentadilla / Peso muerto 1RM, Energía, Calentamiento)
// ya no aparecen en el prompt.

import type { UserProfile } from '@/lib/profile';
import {
  deriveElbowPain,
  deriveFingerPain,
  deriveShoulderPain
} from '@/lib/brain/derive-pain-signals';

// Audit-360 · rediseño lesión (07/07/2026): el "Dolor actual" que ve el
// LLM se deriva por las mismas reglas que §1.3 del brain (ver route.ts::
// profileForRules). Sin esto el LLM veía "codo 0/10" y "Lesiones: elbows"
// simultáneamente — señal contradictoria. `latestCheckIn` es opcional (los
// callers viejos pueden no pasarlo; en ese caso solo se derivan las señales
// de lesión + fallback legacy currentXPain).
type LatestCheckInMin = { fingerPain?: number | null } | null;

export function profileToPrompt(
  profile: UserProfile,
  latestCheckIn: LatestCheckInMin = null
) {
  const derivedFingerPain = deriveFingerPain(profile.injuries, latestCheckIn, profile);
  const derivedShoulderPain = deriveShoulderPain(profile.injuries, profile);
  const derivedElbowPain = deriveElbowPain(profile.injuries, profile);
  const lines: string[] = [];
  lines.push(`Coach: ${profile.character === 'senda' ? 'Senda' : 'Bill'}`);
  if (profile.name) lines.push(`Nombre: ${profile.name}`);
  if (profile.age) lines.push(`Edad: ${profile.age}`);
  if (profile.sex) lines.push(`Sexo: ${profile.sex}`);
  if (profile.weight) lines.push(`Peso: ${profile.weight} kg`);
  // Bloque 4 audit-360: estatura / proyecto / contexto proyecto se
  // eliminaron del onboarding. goalDescription unifica los tres textareas.
  lines.push(`Tiempo escalando: ${profile.climbingTime}`);
  if (profile.disciplines?.length) lines.push(`Disciplinas: ${profile.disciplines.join(', ')}`);
  if (profile.level) lines.push(`Nivel: ${profile.level}`);
  if (profile.setting) lines.push(`Setting: ${profile.setting}`);
  if (profile.goals?.length) lines.push(`Objetivos: ${profile.goals.join(', ')}`);
  if (profile.goalDescription) lines.push(`Descripción objetivo: ${profile.goalDescription}`);
  lines.push(`Días por semana: ${profile.daysPerWeek}`);
  // H-03 audit-360 Bloque 3: desglose entre escalada y entrenamiento extra.
  // El motor lo necesita para no armar sesiones de gym cuando el user ya
  // dedica todos sus días a escalada, y viceversa. Ambos son opcionales en
  // el schema para no romper perfiles previos.
  if (
    profile.climbingDaysPerWeek !== null &&
    profile.climbingDaysPerWeek !== undefined &&
    profile.trainingDaysPerWeek !== null &&
    profile.trainingDaysPerWeek !== undefined
  ) {
    lines.push(
      `Desglose: Escalada ${profile.climbingDaysPerWeek} días · Entrenamiento extra ${profile.trainingDaysPerWeek} días`
    );
  }
  if (profile.availableDays?.length)
    lines.push(`Días disponibles: ${profile.availableDays.join(', ')}`);
  lines.push(
    `Duración sesión: ${profile.sessionDuration} min (máx ${profile.maxSessionDuration})`
  );
  if (profile.equipment?.length) lines.push(`Equipo: ${profile.equipment.join(', ')}`);
  if (profile.equipmentNotes) lines.push(`Setup: ${profile.equipmentNotes}`);
  // Bloque 4 audit-360: `previousTraining` recortado del onboarding.
  if (profile.pullUpAbility) lines.push(`Dominadas (categoría): ${profile.pullUpAbility}`);
  if (profile.fingerTrainingExperience)
    lines.push(`Exp. dedos: ${profile.fingerTrainingExperience}`);

  // ---- Fuerza absoluta (B1) — datos que el coach usa para fijar intensidades
  // reales, no inventadas. Si vienen null se omiten para no inducir al modelo
  // a usar el valor cero como "cap" real.
  const strengthLines: string[] = [];
  if (profile.pullupsBodyweight !== null && profile.pullupsBodyweight !== undefined) {
    strengthLines.push(`Dominadas BW máx reps: ${profile.pullupsBodyweight}`);
  }
  if (
    profile.pullupsAddedWeight5Reps !== null &&
    profile.pullupsAddedWeight5Reps !== undefined
  ) {
    strengthLines.push(`Dominadas con peso para 5 reps: +${profile.pullupsAddedWeight5Reps} kg`);
  }
  if (profile.hangboard20mmSeconds !== null && profile.hangboard20mmSeconds !== undefined) {
    strengthLines.push(`Regleta 20mm BW: ${profile.hangboard20mmSeconds} seg`);
  }
  if (
    profile.hangboard20mmAddedWeight7s !== null &&
    profile.hangboard20mmAddedWeight7s !== undefined
  ) {
    strengthLines.push(
      `Regleta 20mm con peso para 7 seg: +${profile.hangboard20mmAddedWeight7s} kg`
    );
  }
  // Bloque 4 audit-360: bench/squat/deadlift recortados. Solo quedan
  // los cuatro anclas de dominadas + regleta 20 mm, específicos de escalada.
  if (strengthLines.length) {
    lines.push('Fuerza (USAR para calibrar intensidades reales, no inventar):');
    for (const item of strengthLines) lines.push(`  ${item}`);
  }
  // Bloque 4 audit-360: campusExperience, outdoorFrequency, energy y warmup
  // recortados. `sleep` se conserva porque §5.3 lo consume.
  lines.push(`Agresividad: ${profile.trainingAggressiveness ?? 'balanced'}`);
  if (profile.injuries?.length) lines.push(`Lesiones: ${profile.injuries.join(', ')}`);
  if (profile.injuryNotes) lines.push(`Notas lesión: ${profile.injuryNotes}`);
  lines.push(
    `Dolor actual — dedos ${derivedFingerPain}/10, hombro ${derivedShoulderPain}/10, codo ${derivedElbowPain}/10`
  );
  if (profile.sleep) lines.push(`Sueño: ${profile.sleep}`);
  lines.push(`Duración plan: ${profile.planDuration} semanas`);
  return lines.join('\n');
}
