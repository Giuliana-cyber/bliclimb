// Mensajes de celebración por personaje.
// Bill = directo, técnico, masculino. Senda = cálida, empoderadora.
//
// Para milestones (7/14/30/100), cada personaje tiene SU propia voz. Los
// mensajes especiales reemplazan al pool general cuando hay milestone.

export type CharacterKey = 'bill' | 'senda';

const BILL_MESSAGES: string[] = [
  'Sesión completada. Mañana subimos un poco más.',
  'Eso es trabajo serio. Bien hecho.',
  'Tu cuerpo está aprendiendo. Cada sesión cuenta.',
  'Limpio. Eso es ejecución consistente.',
  'Sumá. Lo que entrenaste hoy ya cuenta como base.',
  'No fue espectacular, fue mejor: fue completo.',
  'Una sesión más en el banco. Eso es lo que mueve la aguja.',
  'Tu próximo proyecto ya empezó. Hoy fue el primer paso.',
  'Sesión cerrada. Descansá; mañana hay carga otra vez.',
  'Esto es construir. Sin atajos. Bien.',
  'Eso fue volumen útil. Lo vas a notar en 3-4 semanas.',
  'Buen control. Eso es lo que separa fuerza real de bluf.',
  'Cerraste el día. Eso es disciplina, no motivación.',
  'Un día sin excusas. Eso es 90% del trabajo.',
  'Lo que entrenaste hoy te va a salvar de una caída futura.',
  'Esto no es magia. Es lo que pasa cuando vas seguido.',
  'Sesión ✓. Comé bien, dormí bien, mañana repetimos.',
  'No te quedaste cómodo. Eso vale el doble.',
  'Bien ejecutado. Técnica primero, fuerza después.',
  'Una hora bien usada vale más que cinco a medias. Bien hecho.'
];

const SENDA_MESSAGES: string[] = [
  'Lo hiciste. Una sesión más en el camino.',
  'Esto es cómo se construye fuerza real. Paso a paso.',
  'Tu progreso de hoy lo vas a sentir en tu próximo proyecto.',
  'Tu cuerpo te está acompañando. Escuchalo y seguí.',
  'Lo que hiciste hoy te acerca a algo más grande.',
  'Pequeño pero firme. Así se hace.',
  'Notá cómo tu técnica está madurando. Eso no se ve, se siente.',
  'Cerraste con respeto por tu cuerpo. Eso es lo importante.',
  'Otra capa más de confianza. Sumemos.',
  'Esto cuenta. Cada sesión es un voto a favor de tu yo escalador.',
  'Estás aprendiendo a moverte con más calma. Se nota.',
  'Tu adherencia es lo que va a hacer la diferencia, no las sesiones perfectas.',
  'Volviste a tu plan hoy. Eso ya es mucho.',
  'Te diste un espacio para crecer. Eso es regalo, no obligación.',
  'Lo importante no fue lo duro que pegó, fue que apareciste.',
  'Tu cuerpo recordó algo nuevo hoy. Confiá en el proceso.',
  'Estás construyendo algo que después te va a sostener arriba.',
  'No tenías que dar el 100% — diste lo que tu cuerpo necesitaba.',
  'Esta es la versión de vos que se compromete con su entrenamiento.',
  'Volviste a poner manos en pared (o en hangboard). Bien.'
];

const BILL_MILESTONES: Record<7 | 14 | 30 | 100, string> = {
  7: 'Siete días seguidos. Esto ya es un hábito, no un intento.',
  14: 'Dos semanas. La adherencia es lo que separa a los que progresan de los que no.',
  30: 'Un mes completo. Esto define a tu yo escalador.',
  100: 'Cien días. Pocos llegan acá. Vos sí.'
};

const SENDA_MILESTONES: Record<7 | 14 | 30 | 100, string> = {
  7: 'Una semana completa. Eso ya cambió algo en cómo te ves entrenando.',
  14: 'Dos semanas seguidas. Esto es construir confianza, no solo fuerza.',
  30: 'Un mes. Mirá lo lejos que viniste de donde empezaste.',
  100: 'Cien días. Eso ya es identidad, no esfuerzo.'
};

export type CelebrationOptions = {
  character: CharacterKey;
  /** Si la sesión cruzó un hito (7/14/30/100), usa el mensaje milestone. */
  milestone?: 7 | 14 | 30 | 60 | 100 | null;
  /**
   * Semilla determinista (ej. session.id) para que el mismo evento siempre
   * dé el mismo mensaje. Si se omite, usa Math.random().
   */
  seed?: string;
};

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickFromPool(pool: string[], seed?: string): string {
  if (!pool.length) return '';
  const idx = seed ? hashSeed(seed) % pool.length : Math.floor(Math.random() * pool.length);
  return pool[idx];
}

/**
 * Devuelve un mensaje de celebración para mostrar al usuario.
 *
 * - Si hay milestone (7/14/30/100): usa el milestone del personaje.
 *   60 cae al pool normal porque no se diseñó copy especial (el spec lista
 *   60 en STREAK_MILESTONES pero no en los textos).
 * - Si no: pesca del pool general del personaje.
 */
export function pickCelebrationMessage(options: CelebrationOptions): string {
  const { character, milestone, seed } = options;
  if (milestone === 7 || milestone === 14 || milestone === 30 || milestone === 100) {
    return character === 'senda' ? SENDA_MILESTONES[milestone] : BILL_MILESTONES[milestone];
  }
  return pickFromPool(character === 'senda' ? SENDA_MESSAGES : BILL_MESSAGES, seed);
}

/**
 * Exportado para que la UI pueda enumerar todos los mensajes (ej. en tests
 * o para tooling de QA).
 */
export const CELEBRATION_POOL = {
  bill: BILL_MESSAGES,
  senda: SENDA_MESSAGES,
  billMilestones: BILL_MILESTONES,
  sendaMilestones: SENDA_MILESTONES
} as const;
