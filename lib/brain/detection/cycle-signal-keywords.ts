// Layer 1 de detección de señal clínica de ciclo — Senda.
//
// Diseño (aprobado Giuliana 2026-07-07):
//   Red ESPECÍFICA (no capta menciones neutras como "estoy en mis días").
//   Dentro de cada dominio (ausencia, training-link, severidad) es amplia
//   para atrapar paráfrasis. Layer 2 (LLM classifier) refina la categoría
//   final. Función pura, sin IO. Latencia <1ms.

/**
 * Familias de patrones — todas requieren match completo de al menos una
 * línea del array para disparar el dominio correspondiente.
 */

// -------------------- AUSENCIA de ciclo --------------------
// Frases directas de que la menstruación NO aparece.
const ABSENCE_PATTERNS: readonly RegExp[] = [
  /\bno me\s+(baja|viene|llega|ha venido|ha bajado|est[aá] bajando|ha llegado)\b/i,
  /\bsin\s+(regla|menstruaci[óo]n|per[íi]odo|periodo|ciclo)\b/i,
  /\bno tengo\s+(regla|menstruaci[óo]n|per[íi]odo|periodo)\b/i,
  /\bfalta\s+la\s+regla\b/i,
  /\bdesapareci[óo]\s+(el|mi)\s+ciclo\b/i,
  // Términos médicos explícitos
  /\bamenorrea\b/i,
  /\boligomenorrea\b/i,
  /\bred[- ]?s\b/i
] as const;

// -------------------- TRAINING LINK --------------------
// Ligar la ausencia/cambio con subida de carga o cambio de entrenamiento.
const TRAINING_LINK_PATTERNS: readonly RegExp[] = [
  /\bdesde\s+que\s+(aument[eé]|sub[íi]|entren[oó] m[aá]s|empec[eé] a entrenar)/i,
  /\bcon\s+(el aumento|la subida)\s+de\s+(carga|volumen|intensidad)/i,
  /\bdesde\s+(el|un)\s+nuevo\s+plan/i,
  /\bal\s+(aumentar|subir)\s+(la|el)\s+(carga|intensidad|volumen)/i,
  /\bentrenando\s+m[aá]s\s+(fuerte|volumen|carga|duro)/i,
  /\bcuando\s+aumento\s+(la|el)\s+(carga|intensidad|volumen)/i
] as const;

// -------------------- SEVERIDAD de dolor --------------------
// Solo dolor clínicamente severo — descarta "cólico leve", "me duele un poco".
const SEVERITY_LEXICON_PATTERNS: readonly RegExp[] = [
  // "dolor [adj]" y "dolor es/está [adj]" — verbo cópula opcional entre medio.
  /\bdolor\s+(?:(?:es|era|est[aá]|se pone|se puso)\s+)?(severo|intenso|fuerte|insoportable|extremo|incapacitante|feo|terrible|horrible)\b/i,
  /\bdolor\s+que\s+(me frena|no aguanto|no soporto)\b/i,
  // Adjetivo antes de "dolor" también cuenta ("un insoportable dolor")
  /\b(severo|intenso|insoportable|extremo|incapacitante)\s+dolor\b/i
] as const;

const FUNCTIONAL_IMPACT_PATTERNS: readonly RegExp[] = [
  /\bno\s+puedo\s+(moverme|funcionar|caminar|levantarme|hacer nada)\b/i,
  /\bme\s+deja\s+(tirada|en cama|paralizada|sin poder)\b/i,
  /\bno\s+aguanto\s+el\s+dolor\b/i,
  /\bme\s+dobla\s+de\s+dolor\b/i
] as const;

const PAINKILLER_INEFFECTIVE_PATTERNS: readonly RegExp[] = [
  /\b(ni con|ni tomando)\s+(pastillas|analg[eé]sicos|ibuprofeno|paracetamol|nada)\b/i,
  // "no me hace nada" / "no me hacen nada" — singular y plural del verbo.
  /\b(analg[eé]sicos|ibuprofeno|paracetamol|pastillas)\s+no\s+(me\s+(?:hace|hacen)|(?:hace|hacen))\s+nada\b/i
] as const;

// -------------------- DETECCIÓN DE MESES (para Layer 2 context) --------------------
// Captura N para clasificar amenorrea 3+ meses vs indeterminada.
const MONTHS_ELAPSED_PATTERN = /\bhace\s+(?:como\s+|casi\s+)?(\d+)\s+(mes|meses)\b/i;

// -------------------- API pública --------------------

export type CycleSignalHit = {
  hit: boolean;
  domains: {
    absence: string[];        // patrones matcheados de ausencia
    trainingLink: string[];   // patrones matcheados de training link
    severity: string[];       // patrones matcheados de dolor severo
    functionalImpact: string[];
    painkillerIneffective: string[];
  };
  monthsElapsed: number | null; // capturado de "hace N meses"
};

const EMPTY_HIT: CycleSignalHit = {
  hit: false,
  domains: {
    absence: [],
    trainingLink: [],
    severity: [],
    functionalImpact: [],
    painkillerIneffective: []
  },
  monthsElapsed: null
};

function findMatches(text: string, patterns: readonly RegExp[]): string[] {
  const out: string[] = [];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) out.push(m[0]);
  }
  return out;
}

/**
 * Detecta señal clínica de ciclo o dolor severo. Devuelve todos los
 * dominios matcheados (Layer 2 usa este contexto para clasificar).
 *
 * hit=true cuando ALGUNA de las condiciones válidas se cumple:
 *   - Ausencia (sola)                         → Layer 2 clasifica según meses/link
 *   - Training link (solo)                    → NO dispara Layer 2 sin ausencia
 *   - Severidad léxica + impacto funcional    → dolor severo probable
 *   - Severidad léxica sola                   → puede ser severo, Layer 2 refina
 *   - Impacto funcional solo                  → puede ser severo, Layer 2 refina
 *   - Painkiller ineffective                  → refuerza dolor severo si co-ocurre
 *
 * Diseño anti-falso-positivo: training link SOLO no dispara (evita disparar
 * ante "desde que aumenté la carga estoy más cansada" sin mención de ciclo).
 */
export function detectCycleSignal(userMessage: string): CycleSignalHit {
  if (!userMessage || typeof userMessage !== 'string') return EMPTY_HIT;
  const text = userMessage;

  const absence = findMatches(text, ABSENCE_PATTERNS);
  const trainingLink = findMatches(text, TRAINING_LINK_PATTERNS);
  const severity = findMatches(text, SEVERITY_LEXICON_PATTERNS);
  const functionalImpact = findMatches(text, FUNCTIONAL_IMPACT_PATTERNS);
  const painkillerIneffective = findMatches(text, PAINKILLER_INEFFECTIVE_PATTERNS);

  const monthsMatch = text.match(MONTHS_ELAPSED_PATTERN);
  const monthsElapsed = monthsMatch ? parseInt(monthsMatch[1], 10) : null;

  // Regla anti-falso-positivo: training link solo NO dispara. Necesita
  // co-ocurrir con absence para significar RED-S.
  const hit =
    absence.length > 0 ||
    severity.length > 0 ||
    functionalImpact.length > 0 ||
    painkillerIneffective.length > 0;

  return {
    hit,
    domains: {
      absence,
      trainingLink,
      severity,
      functionalImpact,
      painkillerIneffective
    },
    monthsElapsed
  };
}
