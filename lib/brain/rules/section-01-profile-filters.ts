// Sección 1 del Doc 02 v3 — Filtros de perfil.
//
// Reglas implementadas en sub-fase 1:
//   1.1 Edad / menores de 16
//   1.2 Años de práctica sistemática (<2 años)
//   1.3 Lesión activa o dolor actual (>=3/10)
//
// Diferidas a v2 (fuera de scope):
//   1.4 Cribado RED-S / LEAF-Q
//   1.5 Embarazo
//
// Estas reglas emiten CATEGORÍAS semánticas (BlockedCategory) o ZONAS
// anatómicas (BlockedZone). La traducción a IDs del catálogo vive en
// section-02 (sub-fase 2).

import { SECTION_01_MESSAGES } from '../messages/section-01';
import type {
  BlockedCategory,
  BlockedZone,
  ProfileForRules,
  RuleModule,
  Verdict
} from '../types';

// -------------------- 1.1 — Menores de 16 --------------------
//
// Trigger: age === 'u16'. El bucket u16 del onboarding cubre "usuario <16
// años, o en pico de crecimiento adolescente" del Doc 02 §1.1.
//
// Age vacío/desconocido NO dispara la regla (asume adulto). Justificativo:
// para 1.1, activar por defecto en perfiles legacy sin bucket bloquearía a
// la gran mayoría por asumir que son menores. La regla es strict-match del
// bucket 'u16'.
//
// Categorías bloqueadas mapean al texto de §1.1: hangboard/fingerboard,
// campus board, FM-014 HIT, prefijo CB-, full crimp / regletas pequeñas.
const RULE_1_1_CATEGORIES: BlockedCategory[] = [
  'hangboard',
  'campus',
  'full-crimp',
  'hit',
  'finger-training-any'
];

function check_1_1(profile: ProfileForRules): Verdict | null {
  if (profile.age !== 'u16') return null;
  return {
    kind: 'block-categories',
    rule: '1.1',
    categories: [...RULE_1_1_CATEGORIES],
    userMessage: SECTION_01_MESSAGES.minorsAge.text,
    source: SECTION_01_MESSAGES.minorsAge.source
  };
}

// -------------------- 1.2 — Menos de 2 años de práctica --------------------
//
// Trigger: climbingTime ∈ {'start', 'less1', '1to3'}. Decisión de Giuliana
// (Doc de decisiones Fase 3): el bucket '1to3' se trata como NO cumple los
// 2 años, del lado seguro. Solo 'more3' desbloquea 1.2.
//
// climbingTime vacío/desconocido DISPARA la regla (conservativo). Sin saber
// los años de práctica, no permitimos hangboard intenso. Es coherente con
// "ante duda, lado seguro" del principio transversal.
//
// Categorías bloqueadas de §1.2: hangboard intenso, MaxHangs, IntHangs/
// Repeaters, Campus Board, HIT, dominadas con lastre, tests máximos.
const RULE_1_2_UNLOCK_BUCKET = 'more3';
const RULE_1_2_CATEGORIES: BlockedCategory[] = [
  'hangboard-intense',
  'campus',
  'hit',
  'pullups-weighted',
  'max-tests'
];

function check_1_2(profile: ProfileForRules): Verdict | null {
  if (profile.climbingTime === RULE_1_2_UNLOCK_BUCKET) return null;
  return {
    kind: 'block-categories',
    rule: '1.2',
    categories: [...RULE_1_2_CATEGORIES],
    userMessage: SECTION_01_MESSAGES.practiceYears.text,
    source: SECTION_01_MESSAGES.practiceYears.source
  };
}

// -------------------- 1.3 — Dolor activo por zona (umbral 3+) --------------------
//
// Trigger: pain >= 3 en cualquiera de las 3 escalas disponibles. Umbral 3
// decidido por Giuliana (Doc de decisiones): "molestia leve no bloquea".
//
// Emite un Verdict por zona afectada (perfil con dolor en 2 zonas produce
// 2 verdicts). El validator los acumula.
//
// Gap conocido: Doc 02 §1.3 lista 6 zonas (dedos, poleas, muñeca, codo,
// hombro, cuello). Sub-fase 1 cubre las 3 con escala 0-10 en el perfil
// (dedos-poleas / codo / hombro). Muñeca y cuello quedan como deuda
// documentada en canonicalization-debt.md.
const PAIN_THRESHOLD = 3;

function check_1_3(profile: ProfileForRules): Verdict[] {
  const verdicts: Verdict[] = [];
  const emitZone = (zone: BlockedZone) => {
    verdicts.push({
      kind: 'block-zone',
      rule: '1.3',
      zone,
      userMessage: SECTION_01_MESSAGES.activePain.text,
      source: SECTION_01_MESSAGES.activePain.source
    });
  };
  if (profile.currentFingerPain >= PAIN_THRESHOLD) emitZone('fingers-pulleys');
  if (profile.currentElbowPain >= PAIN_THRESHOLD) emitZone('elbow');
  if (profile.currentShoulderPain >= PAIN_THRESHOLD) emitZone('shoulder');
  return verdicts;
}

// -------------------- Módulo exportado --------------------
export const section01ProfileFilters: RuleModule = {
  section: 'section-01',
  ruleIds: ['1.1', '1.2', '1.3'] as const,
  check(profile: ProfileForRules): Verdict[] {
    const out: Verdict[] = [];
    const v1 = check_1_1(profile);
    if (v1) out.push(v1);
    const v2 = check_1_2(profile);
    if (v2) out.push(v2);
    out.push(...check_1_3(profile));
    return out;
  }
};
