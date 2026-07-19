/**
 * Onboarding v2 · Fase 4 UI · Batch 2.
 *
 * Estado del flow multi-step. Se guarda en `useState` durante el
 * onboarding y al final se persiste vía POST /api/onboarding a Supabase.
 *
 * En el piloto: no persiste — al finalizar redirige a /hoy con el
 * PILOT_PROFILE hardcoded. F4-UI backend conecta a Supabase.
 */

export type StepId =
  | 'coach'
  | 'grado'
  | 'dedos'
  | 'estilo'
  | 'equipo'
  | 'salud'
  | 'resumen';

// Orden aprobado por Giuliana 2026-07-19: Seguridad SEGUNDO, antes de
// cualquier pregunta de rendimiento (grado/dedos/estilo). Cuidamos antes
// de dosificar. Resultado (pasaporte) al final celebra el cierre.
export const STEP_ORDER: StepId[] = [
  'coach',
  'salud',
  'grado',
  'dedos',
  'estilo',
  'equipo',
  'resumen',
];

export type Character = 'bill' | 'senda';
// "No sé" en el toggle de disciplina (Giuliana 2026-07-19): cambia
// los chips por un mensaje "te guiamos las primeras semanas".
export type GradoDisciplina = 'boulder' | 'ruta' | 'no-se';
export type EstadoActual = 'activo' | 'volviendo-paron' | 'volviendo-lesion' | 'empezando';
export type Edad = 'menor-16' | '16-35' | '36-50' | 'mas-50';
export type DolorHoy = 'nada' | 'molestia' | 'dolor';
export type Energia = 'a-tope' | 'normal' | 'cansancio';
export type Embarazo = 'no-aplica' | 'si';
export type Zona = 'dedos' | 'codos' | 'hombros' | 'espalda';
export type Estilo =
  | 'regletas'
  | 'romas'
  | 'desplome'
  | 'placa'
  | 'chorreras'
  | 'fisuras';
export type Equipo =
  | 'pesas'
  | 'bandas'
  | 'barra-dominadas'
  | 'campus'
  | 'hangboard'
  | 'trx';

export interface OnboardingState {
  coach: Character | null;
  disciplina: GradoDisciplina;
  grado: string | null; // "V4-V6" o "5.10" o "no-se"
  estadoActual: EstadoActual | null;
  techoHistorico: string;
  hangSeconds: number | null;
  pullups: number | null;
  hasInjury: boolean;
  injuryZone: string;
  estilos: Estilo[];
  objetivo: string;
  sesionesSemana: number;
  equipos: Equipo[];
  masEquipoPronto: boolean;
  edad: Edad | null;
  hasActiveLesion: boolean;
  zonasLesion: Zona[];
  dolorHoy: DolorHoy | null;
  embarazo: Embarazo;
  energia: Energia | null;
}

export const INITIAL_STATE: OnboardingState = {
  coach: null,
  disciplina: 'boulder',
  grado: null,
  estadoActual: null,
  techoHistorico: '',
  hangSeconds: null,
  pullups: null,
  hasInjury: false,
  injuryZone: '',
  estilos: [],
  objetivo: '',
  sesionesSemana: 3,
  equipos: [],
  masEquipoPronto: false,
  edad: '16-35',
  hasActiveLesion: false,
  zonasLesion: [],
  dolorHoy: null,
  embarazo: 'no-aplica',
  energia: null,
};

// Semáforo cálido según DoD (Giuliana 2026-07-18): OK · Ojo · Cuidado.
export type Semaforo = 'ok' | 'ojo' | 'cuidado';

export function computeSemaforo(state: OnboardingState): Semaforo {
  if (
    state.dolorHoy === 'dolor' ||
    (state.hasActiveLesion && state.zonasLesion.length > 0)
  ) {
    return 'cuidado';
  }
  if (state.dolorHoy === 'molestia' || state.energia === 'cansancio') {
    return 'ojo';
  }
  return 'ok';
}
