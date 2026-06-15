import type { CheckIn } from '@/lib/checkin';
import type { TrainingPlan } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';
import { getTodayTrainingState, withDerivedCurrentWeek } from '@/lib/training/current-session';

function summarizeProfile(profile: UserProfile | null) {
  if (!profile) return 'Sin perfil guardado.';
  const parts: string[] = [];
  parts.push(`Coach activo: ${profile.character === 'senda' ? 'Senda' : 'Bill'}`);
  if (profile.name) parts.push(`Atleta: ${profile.name}`);
  if (profile.level) parts.push(`Nivel: ${profile.level}`);
  if (profile.climbingTime) parts.push(`Tiempo escalando: ${profile.climbingTime}`);
  if (profile.disciplines?.length) parts.push(`Disciplinas: ${profile.disciplines.join(', ')}`);
  if (profile.goals?.length) parts.push(`Objetivos: ${profile.goals.join(', ')}`);
  if (profile.goalDescription) parts.push(`Objetivo libre: ${profile.goalDescription}`);
  if (profile.project) parts.push(`Proyecto: ${profile.project}`);
  if (profile.equipment?.length) parts.push(`Equipo: ${profile.equipment.join(', ')}`);
  if (profile.daysPerWeek) parts.push(`Días/sem: ${profile.daysPerWeek}`);
  if (profile.sessionDuration) parts.push(`Duración sesión: ${profile.sessionDuration}min`);
  if (profile.injuries?.length && !profile.injuries.includes('none')) {
    parts.push(`Lesiones: ${profile.injuries.join(', ')}`);
  }
  if (profile.injuryNotes) parts.push(`Notas lesión: ${profile.injuryNotes}`);
  parts.push(
    `Dolor: dedos ${profile.currentFingerPain}/10 · hombro ${profile.currentShoulderPain}/10 · codo ${profile.currentElbowPain}/10`
  );
  if (profile.sleep) parts.push(`Sueño: ${profile.sleep}`);
  if (profile.energy) parts.push(`Energía: ${profile.energy}`);
  return parts.join(' · ');
}

function summarizeCheckIns(checkIns: CheckIn[]) {
  if (!checkIns.length) return 'Sin check-ins.';
  return checkIns
    .slice(0, 3)
    .map(
      (c) =>
        `[${c.date.slice(0, 10)}] RPE ${c.rpe}/10 · dedos ${c.fingerPain}/10 · energía ${c.energy}/5 · sueño ${c.sleep}/5${c.notes ? ` — ${c.notes.slice(0, 80)}` : ''}`
    )
    .join('\n');
}

function summarizePlan(plan: TrainingPlan | null) {
  if (!plan) return 'Sin plan activo.';
  const active = withDerivedCurrentWeek(plan);
  const state = getTodayTrainingState(active);
  const currentWeek = active.weeks.find((w) => w.weekNumber === active.currentWeek);
  const todayLabel =
    state && 'session' in state
      ? `Hoy (${state.kind}): Semana ${state.week.weekNumber} · Día ${state.session.dayNumber} — ${state.session.title}`
      : `Hoy: ${state?.kind ?? 'sin sesión'}`;

  return [
    `Plan: ${active.mesocycleType ?? `${active.totalWeeks} semanas`}`,
    `Objetivo: ${active.mainObjective ?? active.objective ?? 'sin objetivo'}`,
    `Semana ${active.currentWeek}/${active.totalWeeks}${currentWeek ? ` — ${currentWeek.theme}` : ''}`,
    todayLabel
  ].join(' · ');
}

export function buildCoachSystemPrompt({
  profile,
  character,
  plan = null,
  checkIns = []
}: {
  profile: UserProfile | null;
  character?: UserProfile['character'];
  plan?: TrainingPlan | null;
  checkIns?: CheckIn[];
}) {
  const selectedCharacter = character ?? profile?.character ?? 'bill';
  const characterName = selectedCharacter === 'senda' ? 'Senda' : 'Bill';
  const characterVoice =
    selectedCharacter === 'senda'
      ? 'Senda: serena, técnica, reflexiva. Conciencia corporal.'
      : 'Bill: directo, energético, accionable.';

  const hasFingerPain =
    (profile?.currentFingerPain ?? 0) > 0 || checkIns.some((c) => c.fingerPain > 0);
  const highRpe =
    checkIns.length >= 2 &&
    checkIns.slice(0, 3).reduce((sum, c) => sum + c.rpe, 0) / Math.min(3, checkIns.length) > 8.5;
  const lowEnergy =
    checkIns.length >= 2 &&
    checkIns.slice(0, 3).reduce((sum, c) => sum + c.energy, 0) / Math.min(3, checkIns.length) < 2.5;

  return `Eres ${characterName}, coach de escalada de BilClimb.ai. Estilo: ${characterVoice}

REGLAS DE RESPUESTA (no negociables):
- MUY breve. Máximo 4-6 líneas totales por respuesta. Sin prosa larga.
- Español mexicano natural. Sin saludos, sin cierres ("espero que ayude").
- NUNCA uses headings markdown (### / ####). NUNCA tablas.
- Para explicar UN EJERCICIO usa EXACTAMENTE este formato:
  Objetivo: [una frase corta]
  Pasos:
  - [paso 1 corto]
  - [paso 2 corto]
  - [paso 3 corto]
  Qué sentir:
  - [sensación 1]
  - [sensación 2]
  Evita:
  - [error 1]
  - [error 2]
  Detente si:
  - [señal 1]
  - [señal 2]
- Para preguntas generales: máximo 3 bullets DIRECTOS. Sin introducción.
- Una sola pregunta de clarificación max. Si tienes contexto suficiente, NO preguntes.
- Si el usuario pregunta "¿qué hago hoy?", responde con la sesión real del plan.

SEGURIDAD (prioridad sobre todo):
- Dolor dedos >0/10: NO fallo, NO max hangs, NO campus, NO arqueo completo. Sí submáximas, extensores, isométricos suaves.
- Si dolor sube a 3/10 o aparece punzante: parar y sugerir fisio.
- Lesión activa: bajar carga, sugerir fisio. NO recomiendes ejercicios contra lesión declarada.

ESTILO DE COACH PRO:
- Usa nomenclatura real: "suspensiones submáximas en regleta 22mm semi-arqueo", "bloque trabajado 80-90%", "frenchies a 90°", NO "ejercicios para dedos".
- Prescripciones exactas: "4x7seg @60-70% BW, descanso 50seg". NO "haz unas suspensiones".

PERFIL: ${summarizeProfile(profile)}

PLAN: ${summarizePlan(plan)}

CHECK-INS RECIENTES:
${summarizeCheckIns(checkIns)}
${hasFingerPain ? '\n⚠️ HAY DOLOR DE DEDOS. Aplica reglas de seguridad estrictas.' : ''}
${highRpe ? '\n⚠️ RPE PROMEDIO ALTO (>8.5). Sugiere considerar descarga.' : ''}
${lowEnergy ? '\n⚠️ ENERGÍA BAJA. Pregunta por sueño y nutrición antes de prescribir más carga.' : ''}`;
}
