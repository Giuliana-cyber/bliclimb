// Textos de Sección 3 (reglas de programación) del Doc 02 v3.
//
// El middleware de sub-fase 4 valida el plan armado por el LLM. Si hay
// violaciones, regenera (hasta 3 intentos). Tras 3 fallidos, muestra al
// usuario el mensaje "fallback" (equivalente al #17 de la tabla de tono
// Belay Partners que Giuliana redactó).
//
// DEUDA — el archivo mensajes-tono-belay-partners.md aún no está en el
// repo (ver canonicalization-debt.md). Usamos un PLACEHOLDER explícito
// para no inventar tono. El texto final se pega en el string
// SECTION_03_FALLBACK_MESSAGE.text SIN cambiar la clave ni la lógica.

export const SECTION_03_FALLBACK_MESSAGE = {
  // PLACEHOLDER — reemplazar con el texto #17 exacto de mensajes-tono
  // cuando ese doc aterrice en el repo. NO inventar tono acá.
  text:
    '[PLACEHOLDER — mensaje #17 de mensajes-tono-belay-partners.md] ' +
    'No pudimos armar un plan que cumpla las reglas de seguridad tras varios ' +
    'intentos. Vamos a ajustar los parámetros antes de reintentar.',
  source: 'Doc 02 §3 (fallback tras 3 retries fallidos)'
} as const;

// Resúmenes internos por regla — solo para logs y para incrustar en el
// prompt de retry (no se muestran al usuario). Verbatim del Doc 02.
export const SECTION_03_RULE_SUMMARIES: Record<string, { text: string; source: string }> = {
  '3.1': {
    text:
      'Orden de la sesión por intensidad: calentamiento → técnica → fuerza ' +
      'máxima → boulder/potencia → power endurance → resistencia → vuelta a ' +
      'la calma. Los esfuerzos de mayor calidad neural van en estado fresco.',
    source: 'Hörst, Barrows'
  },
  '3.2': {
    text:
      'Aprendizaje motor nuevo va en los primeros ~30 minutos de la sesión. ' +
      'Habilidades ya conocidas toleran fatiga moderada.',
    source: 'Hörst (How to Climb 5.12)'
  },
  '3.3': {
    text:
      'No 3 días consecutivos de entrenamiento intenso. Si el usuario ya ' +
      'entrenó 2 días seguidos duro, el día 3 es descanso o sesión suave.',
    source: 'Hörst (How to Climb 5.12)'
  },
  '3.4': {
    text:
      'Recuperación mínima entre sesiones del mismo tipo: strength/max-hangs ' +
      '48-72h, power-endurance al fallo hasta 5 días, aerobic-base ~24h.',
    source: 'Hörst, Barrows, López-Rivera'
  },
  '3.6': {
    text:
      'Si la sesión incluye hangboard, va después del calentamiento y antes ' +
      'del bloque principal de escalada. Nunca hangboard con dedos ya ' +
      'fatigados por escalada.',
    source: 'López-Rivera 2021'
  },
  '3.7': {
    text:
      'Semana de descarga obligatoria tras 8-9 semanas de entrenamiento ' +
      'estructurado. Sin descarga aparece deuda de fatiga y retroceso.',
    source: 'Hörst, López-Rivera & González-Badillo 2019'
  },
  '3.8': {
    text:
      'Orden de capacidades en macrociclo: fuerza antes que resistencia, ' +
      'aeróbico antes que potencias. Aero Cap requiere 8+ semanas de ' +
      'adaptación previa.',
    source: 'Barrows, Hörst, López-Rivera'
  },
  '3.9': {
    text:
      'Power-endurance (anaerobic capacity) requiere una base aeróbica ' +
      'previa de al menos 6 semanas — sin ella, el lactato no se gestiona.',
    source: 'Barrows'
  },
  '3.10': {
    text:
      'Máximo 3 días por semana de energy systems duros (An Cap, An Pow, ' +
      'Aero Pow). El resto es base, técnica o descanso.',
    source: 'Barrows'
  },
  '3.20': {
    text:
      'En una sola sesión, no combinar más de DOS tipos de entrenamiento de ' +
      'alta intensidad. Elementos de baja intensidad (ARC, técnica ligera, ' +
      'movilidad) no cuentan.',
    source: 'BMC TV'
  },
  '10.6': {
    text:
      'Para usuarios que entrenan 4+ días/semana, alternar días pesados y ' +
      'ligeros. Evitar días pesados consecutivos.',
    source: 'Climb Strong'
  }
} as const;
