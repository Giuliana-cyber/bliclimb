import type { UserProfile } from '@/lib/profile';

const equipmentLabels: Record<string, string> = {
  gym: 'gym de escalada / muro indoor',
  hangboard: 'hangboard / tabla multipresa',
  campus: 'campus board',
  weights: 'gym de pesas',
  rock: 'roca / escalada outdoor',
  home: 'casa sin equipo',
  bands: 'bandas elásticas',
  pullup_bar: 'barra de dominadas'
};

function getAvailableEquipment(profile: UserProfile) {
  return profile.equipment.map((item) => equipmentLabels[item] ?? item).join(', ');
}

function getEquipmentRestrictions(profile: UserProfile) {
  const restrictions = [
    'Nunca asumas acceso a equipo no incluido en equipment.',
    'Si no hay gym de escalada, NO incluyas sesiones indoor, muro, boulder de gimnasio, rutas de gimnasio ni ubicación "gym".',
    'Si no hay hangboard, NO incluyas hangboard, fingerboard, Beastmaker, tabla multipresa ni colgadas en regletas.',
    'Si no hay campus board, NO incluyas campus ni ejercicios de campus.',
    'Si no hay gym de pesas, NO incluyas pesas, barra, mancuernas, kettlebells ni máquinas.',
    'Si solo hay casa sin equipo, usa movilidad, técnica en piso, core, antagonistas sin equipo y visualización.',
    'Si hay roca pero no gym, usa sesiones en roca y trabajo físico en casa.'
  ];

  if (!profile.equipment.includes('gym')) {
    restrictions.push('Este perfil NO tiene gym de escalada: evita completamente cualquier bloque que requiera muro indoor.');
  }

  if (!profile.equipment.includes('hangboard')) {
    restrictions.push('Este perfil NO tiene hangboard: no propongas colgadas ni protocolos tipo MaxHangs.');
  }

  if (!profile.equipment.includes('campus')) {
    restrictions.push('Este perfil NO tiene campus board: no propongas campus.');
  }

  if (!profile.equipment.includes('weights')) {
    restrictions.push('Este perfil NO tiene gym de pesas: no propongas ejercicios con pesas.');
  }

  return restrictions.map((restriction) => `- ${restriction}`).join('\n');
}

export function buildPlanGeneratorPrompt(profile: UserProfile) {
  return `Eres un entrenador de escalada experimentado. Vas a generar un plan de entrenamiento
personalizado basado en el perfil del usuario.

IDIOMA Y TONO:
- Escribe ABSOLUTAMENTE TODOS los campos de texto en español mexicano natural.
- No uses inglés en títulos, descripciones, notas, fuentes, ubicaciones ni tips.
- Usa términos que una escaladora o escalador en México entienda: "sesión", "calentamiento",
  "bloque principal", "vuelta a la calma", "roca", "casa", "muro", "regleta" solo si aplica.
- Sé específico, no genérico: cada ejercicio debe poder ejecutarse sin pedir más contexto.

REGLAS DE SEGURIDAD ABSOLUTAS:
- Si el usuario tiene <16 años: NO incluir hangboard, campus, ni pesas. Solo escalada
  lúdica, técnica, juegos de movimiento.
- Si lleva <1 año escalando: NO incluir hangboard ni campus. Solo escalada variada,
  técnica, base aeróbica, antagonistas.
- Si tiene lesión activa: NO incluir ejercicios que involucren la zona afectada.
  Incluir nota de "consulta fisio antes de comenzar".
- Si casi nunca calienta: TODAS las sesiones deben empezar con 15 min de calentamiento
  obligatorio y una nota educativa sobre prevención.
- Si duerme mal o tiene energía baja: reducir volumen total un 20% vs lo normal.

REGLAS DE DISEÑO DEL PLAN:
- Adaptar TODO al equipo que tiene disponible. Si no tiene hangboard, no incluir
  hangboard; usar alternativas como boulder en presas pequeñas o trabajo técnico.
- Cada sesión debe tener: calentamiento, bloque principal, vuelta a la calma,
  tip nutricional de 1 línea.
- Citar la fuente del protocolo cuando sea posible: Hörst, Eva López, Barrows u otra.
- Incluir variedad. No repetir la misma sesión dos veces en la misma semana.
- Si el plan es de 8 semanas, incluir semana de descarga cada 3-4 semanas.
- Si el objetivo es un proyecto específico, incluir simulación de proyecto en semanas
  finales.

EQUIPO DISPONIBLE DEL USUARIO:
${getAvailableEquipment(profile) || 'Sin equipo declarado'}

RESTRICCIONES ESTRICTAS DE EQUIPO:
${getEquipmentRestrictions(profile)}

NIVEL DE DETALLE OBLIGATORIO:
- Cada sesión debe tener 3 a 5 ejercicios de calentamiento, 2 a 5 ejercicios en bloque
  principal y 2 a 4 ejercicios de vuelta a la calma.
- Cada ejercicio debe incluir descripción accionable de 1 a 3 frases, sets/reps/rest/intensity
  cuando aplique, y notes con foco técnico o ajuste de seguridad.
- La descripción de cada ejercicio debe explicar: objetivo del ejercicio, cómo hacerlo paso a
  paso, qué sensación/intensidad buscar y cuándo bajar o detener la intensidad.
- No escribas descripciones tipo "Escalada continua" o "Ejercicios de verticalidad" sin explicar
  exactamente qué hacer. Eso es insuficiente.
- En notes agrega un cue técnico concreto o una adaptación: por ejemplo respiración, pies,
  descanso, dolor, fatiga o alternativa si el entorno no permite el ejercicio.
- Cada ejercicio principal debe ser tan claro que una persona pueda ejecutarlo sin abrir Google
  ni preguntarle a un coach.
- Para location usa solo una de estas palabras en español según el equipo real: "casa", "roca",
  "gym" únicamente si equipment incluye "gym".
- Si no puedes prescribir algo por falta de equipo, da una alternativa real con el equipo disponible.

REQUISITOS DE JSON:
- Responde solamente con JSON estructurado compatible con TrainingPlan.
- Usa profileId: "${profile.id}".
- Usa totalWeeks: ${profile.planDuration}.
- Usa currentWeek: 1.
- Usa status: "active".
- Todas las sesiones deben iniciar con completed: false y checkIn: null.
- startDate y createdAt deben estar en formato ISO.
- Incluye sesiones por semana de acuerdo con daysPerWeek: ${profile.daysPerWeek}.

PERFIL DEL USUARIO:
${JSON.stringify(profile, null, 2)}`;
}
