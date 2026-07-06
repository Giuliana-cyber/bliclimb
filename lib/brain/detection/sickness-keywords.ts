// Detección de señales de enfermedad — §10.3 del Doc 02.
//
// Diseño distinto a §3.15: acá NO hay clasificador LLM porque el usuario
// suele decirlo directo ("estoy engripado", "tengo fiebre"). Falsos
// positivos son raros porque las palabras del vocabulario son específicas
// del dominio médico — no hay ambigüedad tipo "peso ← bajar del peso vs
// bajar del muro".
//
// Dos niveles de severidad:
//   - 'high-symptoms'  → fiebre, covid, escalofríos → §10.3 pide DESCANSO TOTAL.
//   - 'mild-symptoms'  → resfriado, gripe, tos, congestión → REDUCIR volumen /
//                        sustituir por aeróbico suave.
//
// Precedencia: si un mensaje matchea AMBOS niveles ('resfriado con fiebre'),
// devuelve 'high-symptoms' (el más restrictivo gana).
//
// Función pura, sin IO. Latencia <1ms para mensajes < 1KB.

import { normalizeForMatch } from './weight-topic-keywords';

/**
 * Vocabulario de síntomas ALTOS — disparan descanso total.
 * Fiebre, escalofríos, covid, síntomas sistémicos.
 * Todas las palabras sin tildes y lowercase (post-normalización).
 */
export const SICKNESS_HIGH_KEYWORDS: readonly string[] = [
  'fiebre',
  'febril',
  'escalofrio',
  'escalofrios',
  'covid',
  'coronavirus',
  'gripa',        // variante regional de gripe con síntomas sistémicos
  'temperatura',  // "tengo temperatura" — común para fiebre
  'termometro'
];

/**
 * Regex numéricos de temperatura clara de fiebre (≥38°C). Se aplican en
 * paralelo al vocabulario para capturar "tengo 38.5" o "38 grados".
 */
export const SICKNESS_HIGH_TEMP_PATTERNS: readonly RegExp[] = [
  /\b3[89](?:[.,]\d)?\s*(?:grados|°|º|c\b)/i,
  /\b4[0-2](?:[.,]\d)?\s*(?:grados|°|º|c\b)/i
];

/**
 * Vocabulario de síntomas LEVES/MEDIOS — reducir volumen, aeróbico suave.
 */
export const SICKNESS_MILD_KEYWORDS: readonly string[] = [
  'resfriado',
  'resfriada',
  'resfriandome',
  'resfrio',
  'gripe',
  'engripado',
  'engripada',
  'enfermo',
  'enferma',
  'enfermarme',
  'tos',
  'toso',
  'congestion',
  'congestionado',
  'congestionada',
  'moco',
  'mocos',
  'mocoso',
  'mocosa',
  'garganta',        // "duele la garganta"
  'faringitis',
  'sinusitis',
  'mucosidad',
  'estornudar',
  'estornudo',
  'estornudos',
  'malestar',
  'flema',
  'flemas'
];

export type SicknessSignal =
  | {
      kind: 'high-symptoms';
      matched: string[]; // dedupe + orden alfabético
    }
  | {
      kind: 'mild-symptoms';
      matched: string[];
    };

/**
 * Detecta si el mensaje del usuario refiere síntomas de enfermedad.
 *
 * Devuelve:
 *   - null si nada matchea.
 *   - { kind: 'high-symptoms', matched } si hay algún keyword de fiebre /
 *     covid / temp ≥38°C (aunque también haya mild).
 *   - { kind: 'mild-symptoms', matched } si solo hay resfriado / gripe / tos.
 *
 * Precedencia: 'high-symptoms' gana sobre 'mild-symptoms'.
 * `matched` incluye TODOS los hits del nivel devuelto (no se mezclan niveles).
 */
export function detectSicknessSignal(userMessage: string): SicknessSignal | null {
  if (!userMessage || typeof userMessage !== 'string') return null;
  const norm = normalizeForMatch(userMessage);
  if (!norm) return null;

  const highHits = new Set<string>();
  for (const kw of SICKNESS_HIGH_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`).test(norm)) highHits.add(kw);
  }
  // Match temp patterns contra el mensaje ORIGINAL (los patterns no dependen
  // de la normalización, y necesitamos preservar dígitos).
  for (const pat of SICKNESS_HIGH_TEMP_PATTERNS) {
    const m = userMessage.match(pat);
    if (m) highHits.add(m[0].trim().toLowerCase());
  }

  if (highHits.size > 0) {
    return { kind: 'high-symptoms', matched: Array.from(highHits).sort() };
  }

  const mildHits = new Set<string>();
  for (const kw of SICKNESS_MILD_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`).test(norm)) mildHits.add(kw);
  }

  if (mildHits.size > 0) {
    return { kind: 'mild-symptoms', matched: Array.from(mildHits).sort() };
  }

  return null;
}
