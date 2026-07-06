// Detección de "muchos intentos en un proyecto" — §10.4 del Doc 02.
//
// Regla 10.4: en un proyecto, tras 7 intentos sin progreso, sugerir parar
// por hoy. Detección SOLO numérica — la vía semántica ("no me sale") tiene
// demasiados falsos positivos ("no me sale un movimiento" no es lo mismo
// que "llevo 7+ intentos en el proyecto"). Decisión de Giuliana: precisión
// > cobertura para no ser intrusivos con una sugerencia suave.
//
// Trigger: mención explícita de un número ≥ 7 asociado a la palabra
// "intento(s)". Ejemplos:
//   "llevo 7 intentos"          → matched
//   "llevo 8 intentos y nada"   → matched
//   "voy por el intento 12"     → matched
//   "6 intentos"                → NO (bajo umbral)
//   "descansé 8 minutos"        → NO (8 no está cerca de "intento")
//   "hice 20 dominadas"         → NO (no menciona "intento")
//
// Función pura, sin IO.

import { normalizeForMatch } from './weight-topic-keywords';

/** Umbral del Doc 02 §10.4. */
export const ATTEMPTS_THRESHOLD = 7;

// Ventana de proximidad: el número y la palabra "intento" deben estar
// dentro de estos N caracteres. Cubre "12 intentos" y "intento 12" pero
// no "descansé 8 minutos y llevo 3 intentos" (donde 8 está lejos de intento).
const PROXIMITY_WINDOW = 25;

/**
 * Regex de la palabra "intento" en cualquier flexión (intento, intentos,
 * intentar, intenté, intentando, intentamos, etc.).
 * Word boundary aplica pero prefijos comunes ("re-intentar") también matchean.
 */
const ATTEMPT_WORD_PATTERN = /\bintent(o|os|ar|amos|aste|astes|aron|e|es|ando|ada|ado)?\b/gi;

/**
 * Regex de números enteros. Cubre "7", "12", "100". No matchea decimales
 * (los intentos son cuentas enteras).
 */
const NUMBER_PATTERN = /\b(\d+)\b/g;

export type AttemptCountSignal = {
  kind: 'high-attempt-count';
  /** El número explícito detectado, siempre >= ATTEMPTS_THRESHOLD. */
  numericCount: number;
  /** Substring del mensaje que matcheo (para logging/debugging). */
  matched: string;
};

/**
 * Detecta si el mensaje del usuario menciona ≥ ATTEMPTS_THRESHOLD intentos
 * en un proyecto. Solo vía numérica; sin heurísticas semánticas.
 *
 * Estrategia:
 *   1. Encontrar todas las ocurrencias de "intento(s)/intentar/etc" en el
 *      texto normalizado (post NFD + lowercase).
 *   2. Para cada ocurrencia, buscar un número entero dentro de una ventana
 *      de ±PROXIMITY_WINDOW caracteres.
 *   3. Si algún número encontrado >= 7 → hit con el mayor número detectado.
 *
 * Devuelve null si no hay match.
 */
export function detectHighAttemptCountSignal(
  userMessage: string
): AttemptCountSignal | null {
  if (!userMessage || typeof userMessage !== 'string') return null;
  const norm = normalizeForMatch(userMessage);
  if (!norm) return null;

  // Recolectar todas las posiciones de "intento(s)".
  const attemptRanges: Array<{ start: number; end: number }> = [];
  ATTEMPT_WORD_PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTEMPT_WORD_PATTERN.exec(norm)) !== null) {
    attemptRanges.push({ start: m.index, end: m.index + m[0].length });
  }
  if (attemptRanges.length === 0) return null;

  // Recolectar todos los números.
  const numbers: Array<{ value: number; start: number; end: number }> = [];
  NUMBER_PATTERN.lastIndex = 0;
  while ((m = NUMBER_PATTERN.exec(norm)) !== null) {
    numbers.push({
      value: parseInt(m[1], 10),
      start: m.index,
      end: m.index + m[0].length
    });
  }
  if (numbers.length === 0) return null;

  // Para cada número, chequear si algún "intento(s)" está dentro de la
  // ventana de proximidad. Recolectar candidatos válidos.
  const candidates: Array<{ value: number; snippet: string }> = [];
  for (const num of numbers) {
    for (const range of attemptRanges) {
      // Distancia = char gap entre los dos tokens (0 si tocan, negativo si
      // se solapan lo cual no debería pasar acá).
      const gap = Math.max(0, Math.min(
        Math.abs(range.start - num.end),
        Math.abs(num.start - range.end)
      ));
      if (gap <= PROXIMITY_WINDOW) {
        const from = Math.min(num.start, range.start);
        const to = Math.max(num.end, range.end);
        candidates.push({
          value: num.value,
          snippet: norm.slice(from, to)
        });
        break; // no doble-contar el mismo número contra dos ocurrencias
      }
    }
  }
  if (candidates.length === 0) return null;

  // Elegir el mayor número entre los candidatos que superen el umbral.
  const overThreshold = candidates.filter((c) => c.value >= ATTEMPTS_THRESHOLD);
  if (overThreshold.length === 0) return null;

  const winner = overThreshold.reduce((a, b) => (a.value >= b.value ? a : b));
  return {
    kind: 'high-attempt-count',
    numericCount: winner.value,
    matched: winner.snippet
  };
}
