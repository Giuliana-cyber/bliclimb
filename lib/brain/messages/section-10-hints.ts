// Templates de hint para §10.3 (sickness) y §10.4 (seven-try) del Doc 02 v3.
//
// Distinto de §3.15: acá NO reemplazamos la respuesta de Bill con un
// mensaje canned. Inyectamos un system message adicional al prompt de Bill
// para que él mismo elabore la respuesta con contexto propio, en su voz,
// respetando la conversación. §3.15 es regla dura (no prescribir pérdida
// de peso); §10.3/§10.4 son consejo que necesita ir contextualizado.
//
// Los hints van dentro del `input` de la Responses API con role='system'
// justo después del coach system prompt principal. Bill los lee como
// instrucción adicional del sistema, no como turno de conversación.

/** §10.3 — síntomas leves (resfriado, gripe, tos, mocos, garganta). */
export function buildSicknessMildHint(matched: string[]): string {
  return (
    `[Regla §10.3 — el atleta mencionó síntomas de resfriado/gripe leves ` +
    `(keywords detectadas: ${matched.join(', ')}). ` +
    `Aplicá §10.3: sugerí REDUCIR volumen de la sesión de hoy. Cambialo por ` +
    `aeróbico suave (Z1), yoga restaurativo, movilidad o descanso activo. ` +
    `Sin trabajo intenso de dedos ni sesiones de fuerza máxima. ` +
    `Si los síntomas persisten 48h+, mencioná que consulte con profesional. ` +
    `Reconocé lo que dijo con naturalidad, no como disclaimer legal.]`
  );
}

/** §10.3 — síntomas altos (fiebre, escalofríos, covid, temp ≥38°C). */
export function buildSicknessHighHint(matched: string[]): string {
  return (
    `[Regla §10.3 — el atleta mencionó síntomas SISTÉMICOS/altos ` +
    `(keywords detectadas: ${matched.join(', ')}). ` +
    `Aplicá §10.3 con severidad ALTA: recomendá DESCANSO TOTAL hoy. ` +
    `Nada de entrenamiento hasta al menos 48h sin fiebre. Si hay fiebre ` +
    `persistente o síntomas fuertes, recomendá consulta médica. Priorizá ` +
    `hidratación y descanso. No es momento de "entrenar suave"; el cuerpo ` +
    `está peleando algo. Decilo con calidez, pero sin dejar dudas de que ` +
    `hoy no se entrena.]`
  );
}

/** §10.4 — más de N intentos en un proyecto sin progreso. */
export function buildAttemptsHint(numericCount: number): string {
  return (
    `[Regla §10.4 — el atleta mencionó ${numericCount} intentos en un ` +
    `proyecto/movimiento. Aplicá §10.4: sugerí PARAR POR HOY y volver ` +
    `fresco/a otro día. Tras 7+ intentos con fatiga acumulada, el SNC está ` +
    `agotado y los intentos siguientes rara vez cierran más que los ` +
    `primeros. Recomendá: descansar, revisar beta con calma (video, ` +
    `visualización), volver con energía en otra sesión. No lo digas como ` +
    `regla técnica — habláselo como coach experimentado que ya vio este ` +
    `patrón muchas veces.]`
  );
}
