// Capa 1 de la regla §3.15 — detección de keywords sobre el mensaje del
// usuario.
//
// Diseño (decisión de Giuliana, arquitectura Opción C):
// Red AMPLIA, deliberadamente. Cualquier mención del universo
// peso/cuerpo/comida/dieta dispara. Falsos positivos son aceptables porque
// la capa 2 (LLM classifier) los filtra. Objetivo: no dejar escapar
// intenciones expresadas con palabras no anticipadas.
//
// Función pura, sin IO. Latencia esperada: <1ms para mensajes < 1KB.
// Normaliza tildes (NFD) y case para robustez.

/**
 * Vocabulario amplio del tema peso/composición/dieta. Todas las palabras
 * en forma sin tildes y lowercase. Se matchean con word boundary contra
 * el mensaje del usuario (también normalizado).
 *
 * IMPORTANTE: agregar keywords es SEGURO. Sacar keywords requiere
 * confirmación explícita — cada palabra removida puede dejar pasar
 * intenciones reales.
 */
export const WEIGHT_TOPIC_KEYWORDS: readonly string[] = [
  // -------- Peso / medidas --------
  'peso',
  'pesar',
  'pesa',
  'pesan',
  'pesada',
  'pesado',
  'kilo',
  'kilos',
  'kg',
  'libra',
  'libras',
  'gramo',
  'gramos',
  // -------- Cambio de peso --------
  'adelgazar',
  'adelgazando',
  'engordar',
  'engordando',
  'bajar',   // amplio — capa 2 filtra "bajar del muro"
  'bajando',
  'subir',   // amplio — capa 2 filtra "subir de grado"
  'subiendo',
  'perder',  // amplio — capa 2 filtra "perder tiempo"
  'perdiendo',
  'ganar',   // amplio — capa 2 filtra "ganar el proyecto"
  'ganando',
  // -------- Composición corporal --------
  'grasa',
  'grasas',
  'musculo',      // sin tilde tras norm
  'musculatura',
  'muscular',
  'magro',
  'magra',
  'flaco',
  'flaca',
  'gordo',
  'gorda',
  'gordura',
  'seco',      // jerga fitness
  'seca',
  'marcado',
  'marcada',
  'definido',
  'definida',
  'delgado',
  'delgada',
  'liviano',
  'liviana',
  'ligero',
  'ligera',
  'composicion',
  'antropometria',
  'antropometrico',
  'imc',
  // -------- Comida / dieta --------
  'dieta',
  'dietar',
  'dietas',
  'comer',
  'comes',
  'come',
  'comida',
  'comidas',
  'alimentar',
  'alimentacion',
  'alimenta',
  'nutricion',    // sin tilde tras norm
  'caloria',
  'calorias',
  'kilocaloria',
  'kcal',
  'macro',
  'macros',
  'proteina',
  'proteinas',
  'carbohidrato',
  'carbohidratos',
  'carbs',
  // -------- Restricción / patrones dietarios --------
  'deficit',
  'ayuno',
  'ayunar',
  'ayunando',
  'restringir',
  'restriccion',
  'saltar',       // "saltarse el desayuno" — amplio, capa 2 filtra
  'saltarse',
  'keto',
  'ketogenica',
  'ketogenico',
  'cetogenica',
  'cetogenico',
  'paleo',
  'vegano',
  'vegetariano',
  // -------- Body image / meta --------
  'cuerpo',
  'silueta',
  'talle',
  'barriga',
  'panza',
  'abdomen',
  'abdominal'
];

/**
 * Normaliza texto para matching: lowercase + strip tildes (NFD) + colapsa
 * whitespace. Mantiene ñ como n para consistencia con las keywords.
 */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip combining diacritics
    .replace(/\s+/g, ' ')
    .trim();
}

export type WeightTopicHit = {
  hit: boolean;
  matched: string[];    // keywords que hicieron match, dedupe + ordenadas
};

/**
 * Capa 1 de §3.15. Devuelve `hit: true` si al menos una keyword del
 * vocabulario matchea el mensaje (por word boundary, case-insensitive,
 * sin tildes). También devuelve la lista de keywords que hicieron match
 * para logging.
 *
 * Función pura. No hace llamadas de red ni IO.
 */
export function detectWeightTopic(userMessage: string): WeightTopicHit {
  if (!userMessage || typeof userMessage !== 'string') {
    return { hit: false, matched: [] };
  }
  const norm = normalizeForMatch(userMessage);
  if (!norm) return { hit: false, matched: [] };

  const matches = new Set<string>();
  for (const kw of WEIGHT_TOPIC_KEYWORDS) {
    // Word boundary requiere que la keyword esté entre caracteres no
    // alfanuméricos. Escape de dot no hace falta porque las keywords son
    // palabras planas.
    const pattern = new RegExp(`\\b${kw}\\b`);
    if (pattern.test(norm)) {
      matches.add(kw);
    }
  }
  return {
    hit: matches.size > 0,
    matched: Array.from(matches).sort()
  };
}
