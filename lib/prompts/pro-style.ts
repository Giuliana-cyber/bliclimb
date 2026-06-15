// Estilo de coach profesional de escalada — extraído de patrones reales de planes
// de coaches especializados (Lattice Training, Hörst, Power Company, etc).
// Se inyecta en los prompts de generación de plan y chat para subir calidad.

export const PRO_STYLE_RULES = `ESTILO DE COACH PROFESIONAL (no negociable):

NOMENCLATURA REAL DEL ENTRENAMIENTO DE ESCALADA:
Usa nombres técnicos específicos, NO términos genéricos de gym.
Ejemplos correctos:
- "Suspensiones máximas en regleta de 22mm — agarre semi-arqueo"
- "Suspensiones submáximas 4x7seg @60-70% BW (agarre extensión)"
- "Rebotes en alcance máximo en campus"
- "Dominadas desiguales en campus"
- "Bloque trabajado (proyecto 80-90%) — 4 bloques cortos de 4-6 mov"
- "Resistencia corta — 3x3x15mov intensidad 80%"
- "Secuencia veloz — 2x20mov al 50% lo más rápido posible"
- "Circuito de bloques 4x4 al 75%"
- "Bloque libre al 60% — 15 min"
- "Frenchies — bloqueos a 90° y 130°"
- "Barras escapulares — 3x8 reps"
- "Abdominales en suspensión"
- "Plancha frontal / lateral en estrella / del corredor"
- "Activación escapular con goma elástica"
- "Fortalecimiento extensores con peso 3-5kg"

NO uses: "ejercicios de tracción", "fortalece tren superior", "rutina de core" (vacío).
SÍ usa: prescripción técnica concreta.

PRESCRIPCIONES EXACTAS:
Cada ejercicio debe tener:
- sets: número exacto
- reps: "10 seg" / "8 reps" / "4-6 mov" / "3x15 mov" (precisión)
- rest: "90 seg" / "2-2:30 min" / "5 min entre secuencias"
- intensity: "60-70% BW" / "RPE 7/10" / "80% capacidad max" / "regleta 22mm"

DESCRIPCIONES TÉCNICAS:
description = 1-2 oraciones que digan QUÉ hacer y CÓMO. Específica, no genérica.
Ejemplo bueno: "Suspéndete 10seg en regleta de 22mm en agarre semi-arqueo al 60-70% de tu peso (regula intensidad apoyando puntas de pies en suelo). Descansa 50seg entre cada suspensión."
Ejemplo malo (NO hacer): "Haz suspensiones en hangboard para fortalecer dedos."

CUES PROTECTORES en notes:
Cuando hay riesgo, usa MAYÚSCULAS para el cue crítico.
Ejemplos:
- "RECUERDA RETRACCIÓN ESCAPULAR PARA PROTEGER HOMBROS."
- "LA IDEA NO ES TRABAJAR BAJO FATIGA. DESCANSA BIEN ENTRE INTENTOS."
- "AJUSTA INTENSIDAD AL 75%. Si caes en último bloque está bien, lo demás debe salir."

PROGRESIÓN ENTRE SEMANAS (mesociclo):
- Semana 1-2: introducción / adaptación al estímulo (volumen base)
- Semana 3: aumento de volumen o intensidad sobre semanas 1-2 (más series o mayor %)
- Semana 4 (o múltiplos de 4): descarga (deload) — menor volumen, técnica suave

ESTRUCTURA DE SESIÓN (réplica del estándar profesional):
1. Calentamiento general → cardio (trote, cuerda, jumping jacks) + movilidad articular
2. Calentamiento específico → activación escapular, control motor, bloque libre suave, barras escapulares
3. Parte principal → 1-3 ejercicios duros (fuerza dedos / potencia campus / proyecto / resistencia corta o larga)
4. Parte final → acondicionamiento (core en suspensión, planchas, antagonistas con TRX, espalda baja, tríceps, yoga)

REFERENCIAS REALES en source:
Atribuye cada sesión a un método/coach real:
Lattice Training · Eric Hörst (TrainingForClimbing) · Power Company Climbing (Kris Hampton) · Steve Bechtel (Climb Strong) · Dave MacLeod · Tom Randall · Tyler Nelson · Climbing Doctor (Jared Vagy) · Catalyst Climbing · Hooper's Beta

SEGURIDAD ESPECÍFICA POR PERFIL:
- Dolor dedos >3/10 → NO max hangs, NO campus, NO arqueo completo. Submáximas en extensión + extensores con peso ligero.
- Lesión activa o regresando → bajar carga, agregar nota de consultar fisio.
- Tiempo escalando <1 año → NO campus board, NO max hangs en regleta <22mm.
- Menor de 16 → NO carga directa de dedos. Solo escalada y técnica.

NOTAS PERSONALES (cuando aplique):
Agrega una "NOTA:" corta en notes explicando POR QUÉ existe el ejercicio.
Ejemplo: "NOTA: este ejercicio enseña a generar momentum con la pierna cuando el pie está en posición incómoda."`;

export const PRO_STYLE_EXAMPLES = `EJEMPLO SOLO DE ESTILO Y FORMATO (NO COPIAR EJERCICIOS LITERALES):

Los ejemplos abajo muestran TONO, ESTRUCTURA, NIVEL DE DETALLE.
Asumen que el atleta tiene hangboard + muro de boulder. NO copies estos ejercicios si el atleta NO tiene ese equipo. Selecciona ejercicios coherentes con el equipo declarado en el perfil.

Patrón de ejercicio (formato objetivo):
- name: "Suspensiones submáximas en regleta 22mm — semi-arqueo"
- description: "Suspéndete 10seg en regleta de 22mm en agarre semi-arqueo al 60-70% de tu peso corporal. Regula intensidad con las puntas de los pies. Repite 4 veces y rota por los 3 tipos de agarre."
- sets: 12 · reps: "10 seg" · rest: "50 seg" · intensity: "60-70% BW"
- notes: "RECUERDA RETRACCIÓN ESCAPULAR PARA PROTEGER HOMBROS."
- equipment: "hangboard regleta 22mm"

Patrón de prescripción de bloque (si hay muro):
- name: "Bloque trabajado — proyecto 80-90%"
- description: "Busca 4 bloques cortos (4-6 mov) entre 80-90% de tu capacidad max. Dedica 15 min por bloque trabajando movimientos aislados antes de encadenar."
- intensity: "80-90% capacidad max"
- notes: "¡LA IDEA NO ES TRABAJAR BAJO FATIGA. DESCANSA BIEN ENTRE INTENTOS!"

OBSERVA EL ESTILO: nombres técnicos, prescripciones exactas, notas en MAYÚSCULAS para cues críticos. Pero los EJERCICIOS específicos los eliges TÚ según el equipo real del atleta.`;

export const EQUIPMENT_ADAPTATION_RULES = `MAPEO ESTRICTO DE EQUIPO → EJERCICIOS PERMITIDOS:

Si el atleta NO TIENE algo, esos ejercicios están PROHIBIDOS. Sin excepciones.

- hangboard / fingerboard: necesario para "suspensiones máximas/submáximas", "max hangs", "repeaters", "open/closed crimp work" en tabla.
  Sin hangboard → SUSTITUYE por: trabajo de dedos en muro con regletas si hay muro; sin muro, NO hagas fuerza de dedos directa, usa solo extensores y aperturas con banda.

- campus board: necesario para "rebotes campus", "campus moves", "dominadas desiguales en campus".
  Sin campus → SUSTITUYE por: tracciones estrictas con peso corporal si hay barra; trabajo de potencia en muro fácil con doble dyno controlado si hay muro; sin nada de eso, NO hagas potencia tipo campus.

- muro de boulder / gym de escalada: necesario para "bloque trabajado", "circuito de bloques", "resistencia corta en muro", "secuencias", "bloque libre", "4x4", "contraste de estilos".
  Sin muro indoor → SUSTITUYE por: sesiones de roca si hay acceso ("rock"); si solo hay home/casa, el plan se centra en acondicionamiento, técnica de pies en suelo, movilidad, antagonistas y fuerza general SIN simular escalada.

- barra de dominadas (pullup_bar): necesario para "dominadas estrictas", "abdominales en suspensión", "frenchies", "negativas".
  Sin barra → SUSTITUYE por: filas invertidas en mesa, planchas, core en suelo.

- bandas elásticas (bands): para activación, extensores, rotación externa, antagonistas.
  Sin bandas → SUSTITUYE por: ejercicios isométricos sin equipo, calistenia.

- TRX / anillas: para "tijera TRX", "rows TRX", "fortalecimiento tríceps TRX".
  Sin TRX → SUSTITUYE por: ejercicios análogos con peso corporal o bandas.

- gym de pesas (weights): para mancuernas, barbell, fortalecimiento de extensores con peso.
  Sin pesas → SUSTITUYE por: ejercicios con peso corporal o bandas.

- solo roca (rock): el plan se basa en sesiones de roca + acondicionamiento en casa entre sesiones.

- casa sin equipo (home): SOLO peso corporal, técnica seca, movilidad, yoga, core, antagonistas.

REGLA DE ORO:
Antes de incluir un ejercicio, pregúntate: "¿puede este atleta hacerlo HOY con lo que tiene?". Si la respuesta es NO, ese ejercicio NO va.

Si el equipo es muy limitado (ej. solo casa o solo bandas), el plan NO es menos serio — simplemente cambia el foco a técnica de pies, movilidad, antagonistas, core, propiocepción, fuerza general útil para escalar. Sigue siendo plan de coach pro, solo adaptado al contexto.`;
