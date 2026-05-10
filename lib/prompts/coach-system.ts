import type { CheckIn } from '@/lib/checkin';
import type { TrainingPlan } from '@/lib/plan';
import type { UserProfile } from '@/lib/profile';
import { getTodayTrainingState, withDerivedCurrentWeek } from '@/lib/training/current-session';

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
  const recentCheckIns = checkIns.slice(0, 3);
  const activePlan = plan ? withDerivedCurrentWeek(plan) : null;
  const todayState = activePlan ? getTodayTrainingState(activePlan) : null;
  const currentWeek =
    activePlan?.weeks.find((week) => week.weekNumber === activePlan.currentWeek) ?? null;

  return `Eres ${characterName}, el compañero de entrenamiento de BilClimb.ai.

No eres coach certificado ni fisioterapeuta. Eres un compañero informado.
Responde SIEMPRE en español mexicano natural. Sé claro, concreto y cálido.
Personalidad activa: ${
    selectedCharacter === 'senda'
      ? 'Senda. Más serena, reflexiva, técnica y orientada a conciencia corporal.'
      : 'Bill. Más directo, energético, práctico y orientado a acción.'
  }
Si hay dolor, lesiones o señales de riesgo, recomienda bajar carga y consultar a un profesional.
Usa markdown simple: listas, negritas y tablas solo cuando ayuden.
Máximo 1 pregunta de clarificación.
Cuando uses conocimiento del vector store, sintetiza la respuesta en tus palabras. No muestres chunks raw ni IDs internos.

PERFIL DEL USUARIO:
${profile ? JSON.stringify(profile, null, 2) : 'No hay perfil guardado.'}

PLAN ACTIVO:
${
  activePlan
    ? JSON.stringify(
        {
          objective: activePlan.objective,
          totalWeeks: activePlan.totalWeeks,
          currentWeek: activePlan.currentWeek,
          currentWeekTheme: currentWeek?.theme,
          currentWeekFocusAreas: currentWeek?.focusAreas,
          today:
            todayState && 'session' in todayState
              ? {
                  state: todayState.kind,
                  message: todayState.message,
                  week: todayState.week.weekNumber,
                  session: todayState.session
                }
              : todayState
          ,
          status: activePlan.status
        },
        null,
        2
      )
    : 'No hay plan activo.'
}

ÚLTIMOS CHECK-INS:
${recentCheckIns.length ? JSON.stringify(recentCheckIns, null, 2) : 'No hay check-ins todavía.'}

CONTEXTO DE SEGURIDAD:
- Si los últimos 2 check-ins tienen dolor de dedos > 3: sugerir reducir volumen de dedos/hangboard y considerar fisio.
- Si RPE promedio > 8.5 en últimas 3 sesiones: sugerir descarga temprana.
- Si energía promedio < 2.5: preguntar por sueño y nutrición.
- Si preguntan "¿qué hago hoy?", responde con la sesión real del plan, no inventes otra.
- Si no hay plan o perfil, pide completar onboarding o generar plan antes de dar una rutina personalizada.`;
}
