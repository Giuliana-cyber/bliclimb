# Bill v2 — Conocimiento Conceptual (para vector store / RAG) — CONSOLIDADO v3

**Propósito de este documento:** Este es el "cerebro" educativo y conceptual de Bill y Senda. Permite que respondan preguntas abiertas, expliquen el porqué de un plan, y razonen cuando el usuario quiere ir más allá de "dame un plan". Cada sección está pensada para chunkearse en piezas independientes (\~200-500 palabras) y subirse al vector store de la OpenAI Responses API.

**Cómo se diferencia de las otras 2 piezas:**

- Los **Ejercicios** (Sheet 01\) dicen qué hacer, con qué dosis.  
- Las **Reglas** (Doc 02\) dicen qué bloquear y cuándo.  
- Este documento dice **por qué** las cosas funcionan así.

**Fuentes:** Saeterbakken et al. 2024, López-Rivera 2021, López-Rivera & González-Badillo 2019, Hörst, Barrows, Michailov, Marcolin et al., Torr et al., Bertuzzi et al., Wall et al., Medernach et al., Stien et al., Orth/Davids/Seifert, Monedero et al., Arellano-Aparicio et al., Smetanka et al., Fryer et al., Muehlbauer et al., Langer et al., Fanchini et al., Deyhle et al., Colomer-Poveda 2023, Ilgner, Flanagan, y coaches/canales: Lattice, Climb Strong, Dave MacLeod, Power Company, Training4Climbing, HMB, Catalyst, The Nugget, Hooper's Beta, BMC, Tom Merrick, Magnus Midtbø, CAMP4, Yoga with Ieva Luna.

**Nota de consolidación (v3):** integra Partes A-S previas \+ nueva **Parte T (Complementos conceptuales v3)** con Forging vs Sharpening, VBT conceptual, Pacing, Simuladores y herramientas de benchmarking. Además: **ampliación de P.1** (StartReact \+ ventana 50-100 ms de RFD) y **ampliación de R.5** (biomecánica FDS/FDP y carga sobre poleas A2/A4).

# PARTE A — Principios fundamentales de programación

## A.1 — La escalada no es sólo fuerza

El rendimiento en escalada depende de al menos cinco factores: técnica, fuerza, capacidades fisiológicas, control mental, y experiencia/lectura de ruta. En principiantes e intermedios, la técnica suele dar más rendimiento que la fuerza pura. La fuerza sin técnica se transfiere mal: un escalador con dominadas de lastre pero sin lectura de ruta no escala más duro — sólo se cansa antes.

## A.2 — Especificidad y transferencia

Cuanto más se parece un ejercicio al gesto real, más se transfiere. Categorías: **No específicos** (dominadas, press — base, transferencia baja); **Semi-específicos** (hangboard, campus, lock-offs — transferencia media-alta); **Específicos** (escalar — transferencia máxima). Para principiantes: mayoría en específico \+ algo de base. Intermedios/avanzados: añadir semi-específico para romper cuellos de botella.

## A.3 — Fuerza máxima vs resistencia: cuál primero

La fuerza máxima se entrena antes que la resistencia: si mejoras tu fuerza máxima, los movimientos submáximos te exigen un porcentaje menor de tu capacidad. La resistencia sobre fuerza pobre llega a un techo rápido. López-Rivera: 8 semanas MaxHangs → 2 descanso → 8 IntHangs. Barrows: Base (fuerza \+ capacidades) → Peak (potencias, manteniendo fuerza).

## A.4 — Capacidades aeróbicas vs potencias: cuál primero

Primero **capacidad aeróbica** (Aero Cap, ARC), luego potencia aeróbica y anaeróbica. Al revés es contraproducente: sin capacidad aeróbica, el ácido láctico no se gestiona. Tiempo mínimo de adaptación Aero Cap: 8+ semanas.

## A.5 — Recuperación es entrenamiento

La adaptación ocurre durante el descanso. Tras bloque de 8-9 semanas: una semana completa obligatoria. Entre sesiones intensas del mismo grupo: 48-72 h mínimo. Power endurance al fallo: hasta 5 días. Tres días seguidos intensos \= receta para sobreentrenamiento. Sueño: tras entrenamientos severos, 9 h; resto, 8 h.

## A.6 — Volumen, intensidad y frecuencia: las tres palancas

Cuando una palanca sube, las otras dos suelen bajar. Para construir, mueve una a la vez. Si todo sube a la vez, te lesionas.

## A.7 — Práctica vs rendimiento *(Mega-batch 6\)*

La mayoría de intermedios escalan siempre intentando rendir. Esto frena el aprendizaje porque para rendir eliges rutas que se adaptan a tus fortalezas; sólo en práctica vas a estilos donde fallas, que es donde se aprende. **Práctica:** rutas de tus debilidades técnicas, foco en aprender movimiento. **Rendimiento:** rutas adaptadas a fortalezas. Hörst: ratio 3:1 práctica:rendimiento para construir nivel, 2:1 consolidado.

# PARTE B — Conceptos clave (glosario explicado)

## B.1 — Hangboard / Fingerboard

Tres métodos: **MaxHangs** (suspensiones cortas de 10 s, carga alta, margen antes del fallo — fuerza máxima); **IntHangs / Repeaters** (10 s on / 5 s off hasta casi fallo — resistencia de fuerza); **SubHangs** (submáximas 70-80% — resistencia/hipertrofia local). Criterio mínimo: \>2 años, ≥16 años, sin lesión, 15 s en 25 mm.

## B.2 — Campus Board

Listones escalonados para potencia y RFD en tren superior y dedos. Movimientos: 1-4-7, ladder, 1-2-3. Sólo avanzados. Carga muy alta en flexores.

## B.3 — Crimp y sus variantes

**Open hand** (dedos extendidos, seguro, menos potente); **Half crimp** (\~90° PIP, sin pulgar — uso general); **Full crimp** (half \+ pulgar sobre índice — máximo control, máxima tensión sobre poleas). Default: half crimp; full crimp sólo avanzados sin historial de polea.

## B.4 — ARC (Aerobic Restoration and Capillarisation)

Escalada continua a intensidad muy baja. Aumenta capilarización del antebrazo y recuperación entre esfuerzos. 20-40 min continuos. Base del espectro aeróbico.

## B.5 — Aero Cap (Aerobic Capacity)

Escalada continua a intensidad sostenible con bomba moderada controlable, sin fallo. 20-40 min. Tarda 8+ semanas en adaptarse.

## B.6 — Power endurance

Sostener esfuerzos intensos 45 s \- 5 min. **Aerobic power** (circuitos \~30 movimientos, 45-120 s); **Anaerobic power** (boulders 5-7 movimientos con descansos muy cortos).

## B.7 — RFD (Rate of Force Development)

Velocidad a la que el músculo desarrolla fuerza. Importante en boulder y dinámicos. Distingue boulderers de escaladores de lead más que la fuerza máxima absoluta.

## B.8 — MIFS (Maximal Isometric Finger Strength)

Suspensión unimanual 5 s en regleta 20 mm con lastre. Predice rendimiento (r=0.42-0.50), normalizado por peso (ICC=0.98) muy fiable. Sólo evaluación avanzada supervisada.

## B.9 — RED-S (Relative Energy Deficiency in Sport)

Síndrome por baja disponibilidad energética sostenida. Afecta huesos, ciclo menstrual, inmunidad, rendimiento y salud mental. Monedero et al. 2023: 88% con disponibilidad subóptima, 28% con LEA. Bill detecta y deriva — nunca diagnostica.

## B.10 — Periodización: Base y Peak

**Base** (\~4 meses): fuerza máxima \+ capacidades. Volumen alto, intensidad media. **Peak** (\~2 meses): mantener fuerza, foco en potencias y resistencia específica. **Taper** (1-2 semanas): volumen \~50%, retirar Aero Cap y ARC. **Transición** (10-30 días): descanso.

## B.11 — Epicondilitis y desequilibrio flexor-extensor *(Mega-batch 5\)*

La escalada desarrolla mucho los flexores (cada agarre es flexión sostenida) mientras los extensores casi no se activan. Este desequilibrio crónico genera tensión asimétrica en las inserciones tendinosas del codo — causa común de epicondilitis lateral (codo de tenista) y medial. Prevención clásica (Hörst): 3×25 reverse wrist curls con peso ligero al final de cada sesión. No es tratamiento — si hay dolor, requiere fisioterapeuta.

- **Fuente:** Hörst, *How to Climb 5.12*.

## B.12 — Capacidad oxidativa local del antebrazo *(Mega-batch 5\)*

Cuán bien el músculo del antebrazo procesa oxígeno y elimina desechos durante esfuerzos sostenidos. Se mide en laboratorio con NIRS. Escaladores con mejor capacidad oxidativa del flexor profundo encadenan grados más altos en redpoint incluso controlando por fuerza máxima (Fryer et al. 2018). Por eso la base aeróbica local (ARC, Aero Cap) importa tanto.

- **Fuente:** Fryer et al. 2018\.

## B.13 — Tipos de agarre y trade-offs de seguridad *(Mega-batch 6\)*

- **Open hand:** el más seguro para tendones y poleas. Debe ocupar la mayor parte del entrenamiento.  
- **Half crimp:** uso general, balance entre control y carga.  
- **Full crimp:** máximo control en agarres muy pequeños, pero la posición que más estresa las poleas. Solo avanzados sin historial, dosificado.  
- **Pinch:** pulgar opuesto a los dedos. Demanda específica.  
- **Sloper:** dedos extendidos sobre superficie redondeada, por fricción y posición de muñeca. Control activo distinto al crimp.  
- **Fuente:** Hörst, Medernach et al., Torr et al.

## B.14 — Fluidez y coordinación experta *(Mega-batch 6\)*

Orth, Davids & Seifert definen el rendimiento experto no solo por fuerza o técnica sino por **fluidez**: minimización de pausas, trayectoria simple del centro de masa, transiciones suaves, mejor uso de información durante la vista previa. En niveles altos el rendimiento se gana más con percepción y fluidez que con kilos extra de fingerboard.

- **Fuente:** Orth, Davids & Seifert.

## B.15 — El grado no es intensidad *(Mega-batch 6\)*

El grado mezcla dificultad de movimientos, duración, tipo de agarres, ángulo, fricción. Dos rutas de 7a pueden tener cargas muy distintas. Bill no prescribe intensidad solo por grado: pregunta por número de movimientos, agarres dominantes, ángulo, ratio práctica/rendimiento, RPE. La FC no funciona en escalada (sube desproporcionadamente al VO2 por contracciones isométricas y brazos por encima del corazón).

- **Fuente:** Michailov 2014\.

# PARTE C — Por qué Bill dice lo que dice (FAQ educativo)

## C.1 — "¿Por qué no puedo empezar con hangboard?"

Tus tendones, poleas y articulaciones necesitan \~2 años de adaptación gradual antes de tolerar la carga concentrada del hangboard. Antes, escalar normal ya da estímulo suficiente.

## C.2 — "¿Por qué no entrenar tres días seguidos?"

La adaptación ocurre durante el descanso. El tercer día estás entrenando con técnica degradada, aumentando riesgo de lesión. Hörst: "nunca entrenes tres días seguidos".

## C.3 — "¿Por qué Bill me pide descansar una semana cada 8?"

Los bloques largos acumulan fatiga en sistema nervioso, músculos, tendones y articulaciones. Una semana sin entrenar disipa esa fatiga y consolida adaptaciones.

## C.4 — "¿Por qué no puedo hacer el plan de \[climber élite\]?"

Ese plan está diseñado para un cuerpo que lleva años adaptándose a esa carga. Aplicarlo directo es como correr un maratón sin haber corrido nunca.

## C.5 — "¿Por qué la fuerza de dedos no se mide con dinamómetro normal?"

El dinamómetro mide cierre completo del puño — distinto del agarre de escalada (flexión de dedos contra superficie pequeña). Los tests específicos (MIFS, MVC en crimp) predicen mejor.

## C.6 — "¿Por qué Bill no usa frecuencia cardiaca?"

En escalada la FC se eleva desproporcionadamente al consumo real de oxígeno. Bill usa RPE, bomba local, número de movimientos, tiempo en pared, calidad técnica.

## C.7 — "¿Por qué a veces me dices 'requiere validación profesional'?"

Bill conoce literatura pero no puede examinarte. Para ejercicios de alto riesgo o señales clínicas, un profesional debe validar antes. Es la diferencia entre ayudarte y hacerte daño sin querer.

## C.8 — "¿Por qué Bill no rehabilita?" *(Mega-batch 5\)*

Bill asigna prevención (reducir probabilidad de lesión sin síntomas). Bill NO rehabilita (tratar una lesión existente): eso requiere examen físico, historial específico, ajustes según evolución y diagnóstico diferencial — trabajo de fisioterapeutas y médicos del deporte. Cuando reportas dolor activo, Bill deja de asignar entrenamiento de la zona y te muestra un mapa para encontrar al profesional adecuado.

## C.9 — "¿Por qué Bill me sugiere retirarme?" *(Mega-batch 6\)*

Retirarse cuando algo no se siente bien no es fracaso, es decisión táctica protectora. Las lesiones serias outdoor frecuentemente ocurren cuando el escalador "ya sabía" que algo no estaba bien pero siguió por ego o por no "perder el esfuerzo invertido". Retirarse hoy \= volver mañana en mejor condición.

- **Fuente:** Ilgner (Guerreros de la Roca).

## C.10 — Boulder outdoor seguro para principiantes *(Mega-batch 6\)*

Bouldering outdoor parece sencillo pero tiene riesgos específicos: **caídas** (mal aterrizaje desde 2-3m sobre superficie irregular \= lesión seria; requiere pads \+ spotter \+ revisar zona); **highballs** (\>3.5m son solo libre sin cuerda, no para principiantes); **descenso** (revisar cómo se baja ANTES de subir); **condiciones** (roca húmeda multiplica el riesgo). La cuerda no protege en boulder — solo tu juicio.

- **Fuente:** Flanagan (Bouldering for Beginners).

# PARTE D — Contradicciones entre fuentes

## D.1 — Volumen de repeaters (NOTA: Beastmaking retirado del corpus)

Sin Beastmaking, la referencia para repeaters es López-Rivera (3-5 sets, 4-5 reps), más conservadora. Bill la usa por defecto.

## D.2 — Entrenar "hasta fallo"

Michailov menciona campus "hasta fallo"; Saeterbakken 2024 propone evitar el fallo usando RIR o margen. Bill: detenerse antes del fallo técnico, especialmente en alta carga sobre dedos.

## D.3 — Frecuencia de campus board

Stien: 2 vs 4 sesiones/semana sin diferencias claras. Bill usa la frecuencia menor efectiva (2/semana).

## D.4 — FC como guía de intensidad

Smetanka usa FC para sesiones recreativas; Michailov advierte que no debe usarse para prescribir intensidad fina. Bill usa FC solo como seguimiento, nunca como input.

## D.5 — Aeróbico general vs específico

Hörst (1996) recomienda aeróbico general para principiantes; Barrows aclara que la capacidad relevante es local al antebrazo. Bill aplica ambos: base general para principiantes/salud, específico (ARC, Aero Cap) para rendimiento.

## D.6 — Jerarquía epistémica del corpus

1. Papers revisados por pares recientes (2020+). 2\. Revisiones sistemáticas y meta-análisis. 3\. Papers antiguos metodológicamente sólidos. 4\. Libros de divulgación reconocidos (Hörst). 5\. Documentos no académicos de practitioners (Barrows): lógica de programación, no dosis.

## D.7 — Dosis de extensores: criterio del corpus *(Mega-batch 5\)*

Hörst propone 3×25 con peso ligero como mantenimiento preventivo. La literatura académica del corpus no da una dosis específica de extensores. Bill aplica la dosis Hörst por defecto (única documentada, riesgo bajísimo, coherente con principios de tendones). Para fuerza avanzada de extensores, Bill no asigna automáticamente — requiere validación profesional.

# PARTE E — Conceptos para Senda (entrenamiento femenino)

## E.1 — Por qué Senda existe como personaje separado

La escalada femenina tiene consideraciones específicas: composición corporal, periodización por ciclo (cuando aplica), mayor incidencia de RED-S documentada, diferencias en respuestas a carga máxima. No son razones para entrenamientos "más suaves" — son razones para entrenamientos mejor informados.

## E.2 — Cribado RED-S como prioridad

Monedero et al. 2023: 88% con disponibilidad subóptima, 28% con LEA franca. Senda normaliza la conversación sobre energía disponible, alimentación y ciclo menstrual como parte del check-in.

## E.3 — Periodización por ciclo: estado actual del conocimiento

La evidencia sobre adaptar entrenamiento al ciclo está en desarrollo. Senda **no** debe prometer protocolos cerrados de periodización por fase basados en literatura inconclusa. Sí puede: registrar ciclo, identificar patrones individuales, sugerir reducir intensidad si los síntomas lo justifican subjetivamente, derivar a profesional para protocolos formales.

## E.4 — Lenguaje sobre cuerpo y rendimiento

Senda evita lenguaje de pérdida de peso, restricción, "lean", o métricas corporales como indicadores de progreso. Habla de fuerza relativa, técnica, capacidad, recuperación. Si una usuaria pregunta sobre peso, derivar a profesional especializado.

# PARTE F — Trabajo mental como pieza del rendimiento *(Mega-batch 7\)*

## F.1 — La mente como "músculo entrenable"

Hörst plantea que la mente se entrena como un músculo: con regularidad, objetivos específicos y disciplina. Seis áreas: motivación, relajación, visualización, foco/objetivo, control emocional, estado ideal de rendimiento. Sus beneficios son menos tangibles inmediatamente — por eso muchos lo ignoran. Bill insiste en que es la pieza que más rinde por minuto invertido en niveles intermedios.

- **Fuente:** Hörst (Cómo entrenar y escalar mejor).

## F.2 — Las 5 rutas del módulo mental

1. **Respiración** (ME-001, ME-002): base de todo, primero en suelo. 2\. **Visualización** (ME-004): con información real. 3\. **Foco** (ME-006): atención sostenida por sesión. 4\. **Gestión del miedo** (ME-005, ME-T001): distinguir razonable de no razonable. 5\. **Rutina pre-escalada** (ME-009): ritual estable.

## F.3 — Miedo razonable vs no razonable (CRÍTICO)

No todo miedo debe "superarse". El miedo razonable mantiene vivo al escalador ("esto está mal, retírate o ajusta"). El no razonable aparece sin peligro objetivo real (miedo al fracaso, a parecer débil, a la altura cuando todo es seguro). Solo el segundo se trabaja con técnicas mentales. Test: ¿hay contraargumento lógico al miedo? Si no, probablemente es razonable.

- **Fuente:** Hörst; Ilgner.

## F.4 — Respiración como ancla

Ilgner propone dos ejercicios base aprendidos primero en suelo: espiración completa y respiración deliberada escalando (exhalar activamente con cada movimiento, dejar que la inhalación ocurra sola). Regla: si no oyes tu propia exhalación al escalar, la estás conteniendo — y contener respiración aumenta tensión, sobreagarre y mala toma de decisiones.

- **Fuente:** Ilgner (Guerreros de la Roca).

## F.5 — ICS (Centrado Instantáneo) para proyectos

Para rutas largas o proyectos, dividir la vía en partes con descansos memorizados. En cada descanso, reset rápido: ¿respiro bien? ¿tengo tensión innecesaria? ¿pienso derrotista? Corregir y continuar. Entrenable: practicar primero en rutas conocidas.

- **Fuente:** Hörst (How to Climb 5.12).

# PARTE G — Nutrición, energía y RED-S *(Mega-batch 7\)*

## G.1 — Qué es RED-S y por qué importa

RED-S aparece cuando un atleta no consume suficiente energía para cubrir gasto \+ funciones básicas. Consecuencias sistémicas: amenorrea, pérdida de densidad ósea, fracturas por estrés recurrentes, inmunidad disminuida, peor recuperación/coordinación/concentración, y — paradójicamente — peor rendimiento. Monedero et al. 2023 (25 escaladores avanzados/élite): 88% con disponibilidad subóptima, 28% con LEA. 36% de las mujeres positivo en LEAF-Q. Es la norma silenciosa en escaladores que entrenan mucho.

- **Fuente:** Monedero et al. 2023; Arellano-Aparicio et al. 2025\.

## G.2 — Disponibilidad energética: el número que importa

EA \= (ingesta calórica total − gasto del ejercicio) / masa libre de grasa, en kcal/kg FFM/día. Umbrales IOC: **≥45** óptima; **30-45** reducida/subclínica; **\<30** LEA clínica (alto riesgo RED-S). Requieren medir FFM (DEXA, BIA) — son referencia, no diagnóstico que Bill haga. El concepto guía: Bill nunca recomienda déficit energético sostenido.

- **Fuente:** Monedero et al. 2023\.

## G.3 — Por qué Bill nunca prescribe perder peso

Monedero et al. concluye que el vínculo bajo peso ↔ rendimiento es conflictivo — los datos no sostienen que el bajo peso sea necesario para rendimiento élite. La evidencia del daño por LEA/RED-S es robusta. Bill explica el trade-off y deriva a profesional.

- **Fuente:** Monedero et al. 2023\.

## G.4 — Ajuste de carbohidratos por carga del día

**Día intenso** (fuerza máxima, power endurance): hasta \~7 g/kg/día. **Día técnico/fácil:** \~3 g/kg/día. **Moderados:** intermedio. Números orientativos y educativos; cualquier prescripción individual requiere nutricionista. El principio importa más que los números: ajustar la ingesta a la demanda, no a una meta estática.

- **Fuente:** Monedero et al. 2023\.

## G.5 — Señales rojas que activan el semáforo

Amenorrea (3+ meses); dolor óseo persistente y localizado (tibia, fémur, metatarsianos); fracturas por estrés repetidas/recientes; pérdida de peso rápida no planificada (\>10% en 3 meses); conducta alimentaria problemática; fatiga persistente sin causa clara. Si aparece alguna, Bill no asigna progresiones intensas hasta valoración profesional.

- **Fuente:** Monedero et al. 2023; Arellano-Aparicio et al. 2025\.

## G.6 — Por qué Bill no es nutricionista

Bill educa sobre principios generales (balance energético, ajuste de carbohidratos, comer post-entreno, señales de RED-S, screening EAT-26/LEAF-Q). Bill NO: calcula calorías individuales, prescribe macros exactos, recomienda suplementos, diseña dietas personalizadas, interpreta cuestionarios para decisiones clínicas, ni recomienda dietas restrictivas (keto, ayuno intermitente). Para todo eso deriva a nutricionista deportivo — obligatorio ante señales clínicas.

# PARTE H — Marcos de referencia para el movimiento *(Lote 8a)*

## H.1 — Los 5 Elementos Atómicos (Power Company)

Todo movimiento se descompone en: 1\. Tensión, 2\. Posición, 3\. Ritmo, 4\. Esfuerzo (ni más ni menos), 5\. Compromiso. Cuando el usuario reporta "algo no funcionó", Bill pregunta por cada elemento en lugar de asumir "falta fuerza". Frecuentemente el fallo está en los 3 últimos.

- **Fuente:** Power Company.

## H.2 — Go Hard / Do More / Explore (Power Company)

Tres tipos de estímulo que se alternan: **Go Hard** (fuerza máxima, poco volumen, descanso completo); **Do More** (resistencia/volumen); **Explore** (aprendizaje técnico, nuevos estilos, sin ego). Bill categoriza cada sesión bajo uno y evita mezclarlos. La mayoría de estancamientos vienen de mezclar Go Hard con Do More.

- **Fuente:** Power Company.

## H.3 — Consistencia \> intensidad esporádica (MacLeod)

"La palabra más importante en escalada es consistencia." 3 veces/semana durante 2 años supera 6 veces/semana durante 4 meses \+ 8 meses de lesión. Bill diseña planes sostenibles.

- **Fuente:** Dave MacLeod.

## H.4 — "One Little Thing" fuera de zona de confort (MacLeod)

Cada sesión, una pequeña incomodidad deliberada (un tipo de presa que evitas, mano no dominante primero). La suma durante 100 sesiones \= evolución técnica real.

- **Fuente:** Dave MacLeod.

## H.5 — La regla 9 de 10 (MacLeod)

9 de cada 10 intermedios cometen los mismos errores: falta de consistencia, tácticas de moda en vez de principios básicos, copiar a los pros sin entender por qué. El camino sencillo suele ser el correcto, pero es aburrido.

- **Fuente:** Dave MacLeod.

## H.6 — "It's Just an Attempt" (MacLeod)

Mantra para disolver ansiedad: "Es solo un intento. La roca seguirá ahí mañana." Reduce el peso del intento (distinto del autodiálogo positivo que aumenta confianza).

- **Fuente:** Dave MacLeod.

## H.7 — "Could vs Should" (HMB)

En lugar de "debería escalar esto" (juicio que aumenta presión), pensar "podría escalar esto" (posibilidad abierta). El primer framing carga el fracaso con vergüenza; el segundo lo convierte en información neutra.

- **Fuente:** HMB.

# PARTE I — Reglas técnicas simples *(Lote 8a)*

## I.1 — Pies-Caderas-Manos (HMB)

Secuencia: 1\. Colocar el pie. 2\. Mover la cadera. 3\. La mano simplemente llega al hold. La mayoría de intermedios invierten el orden (buscan la presa con la mano primero). Resultado: sobreagarre, mala transferencia de peso.

- **Fuente:** HMB.

## I.2 — 3 puntos de contacto (HMB)

Mantener 3 puntos estables mientras el 4to se mueve. Romperlo (2 puntos) debe ser decisión consciente (dinámico controlado), no accidente.

- **Fuente:** HMB.

## I.3 — 5 Ps de Pies (HMB \- Coach Xian)

Place precisely, Pivot, Push, Pull (traccionar con el pie en toe/heel hooks).

- **Fuente:** HMB.

## I.4 — Regla del pecho/cadera al objetivo (Catalyst)

En dinámicos o de compromiso: apuntar pecho y caderas hacia la presa objetivo antes de moverse. La dirección del cuerpo predice la trayectoria del centro de masa.

- **Fuente:** Catalyst.

## I.5 — Skin Drag (Lattice)

La piel se estira 1-2mm al contactar. En regletas pequeñas se pierde 1-2mm de superficie útil. Compensar sobrepasando ligeramente la posición ideal aparente.

- **Fuente:** Lattice.

## I.6 — Regla de 3 intentos post-éxito (McNeice \- Lattice)

Para movimientos de baja probabilidad (coordinación, dinámicos complejos), tras conseguirlo por primera vez, repetirlo 3 veces seguidas para grabarlo en memoria motora.

- **Fuente:** Lattice (Erin McNeice).

## I.7 — Feel Beta (Training4Climbing)

Enfocarse en sensaciones internas (presión en pies, centro de gravedad, cadera) en lugar de instrucciones verbales o visualización externa. Refina el movimiento instintivo. Complementa ME-004.

- **Fuente:** Training4Climbing / Hörst.

# PARTE J — Herramientas mentales adicionales *(Lote 8a)*

## J.1 — Inner Critic Scoring (Catalyst)

Puntuar el pensamiento autocrítico: 1/10 (falso e inútil), 5/10 (cierto pero inútil), 10/10 (cierto y útil/accionable). Solo los 10/10 informan cambios de estrategia.

- **Fuente:** Catalyst.

## J.2 — Box Breathing 4-4-4 (HMB)

Inhalar 4s, retener 4s, exhalar 4s, retener 4s vacío. Repetir 3-5 veces. Alternativa a ME-001 para bajar ansiedad rápido.

- **Fuente:** HMB.

## J.3 — Visualización con ojos cerrados sintiendo agarres (HMB)

Extensión de ME-004: tras leer la ruta visualmente, cerrar ojos y visualizar sintiendo la textura y forma de cada agarre. Activa memoria motora, no solo visual.

- **Fuente:** HMB.

# PARTE K — Rehabilitación como filosofía *(Lote 8a)*

## K.1 — "Rehab es entrenar en presencia de una lesión" (Lattice)

No es "no entrenar hasta sanar". Es diseñar entrenamiento que evita cargar la estructura lesionada, mantiene condicionamiento sistémico, introduce carga progresiva según fase de cicatrización, y prepara el retorno. Bill nunca dice "descansa hasta sanar" salvo indicación médica; dice "estas son las rutas de trabajo compatibles con tu lesión, según tu profesional tratante".

- **Fuente:** Lattice.

## K.2 — Progresión Rehab MacLeod (referencia general)

Marco conceptual (NO plan clínico): Semanas 1-2 reposo activo \+ Grip Master suave; Semana 3: 1 serie de 10 dominadas \+ foot-off bouldering \+ Max Hangs suaves; Semana 4: anillas sin máximo; Mes 3: pies \+ circuitos progresivos. Bill NUNCA aplica sin coordinar con el fisioterapeuta tratante.

- **Fuente:** Dave MacLeod.

# PARTE L — Marcos de autoconocimiento del escalador *(Lote 8b)*

## L.1 — Arquetipos Hammer vs Crowbar (The Nugget \- Will Anglin)

**Hammer:** resuelve con potencia y compromiso máximo; falla cuando "no encuentra la solución". **Crowbar:** resuelve con posición, apalancamiento y precisión; falla en cruxes puramente físicos. Reconocer el propio arquetipo permite entrenar la debilidad relevante, elegir proyectos que ajusten, y explotar el arquetipo en competición.

- **Fuente:** The Nugget (Will Anglin).

## L.2 — Bandwidth cognitivo (The Nugget)

Capacidad de procesar información interna (sensaciones, respiración, tensión) y externa (siguiente presa, pies, chapaje) simultáneamente. Principiantes procesan una cosa a la vez. Señal de bandwidth insuficiente: al caer, no puede explicar por qué falló. Bill usa TC-FREEZE para expandirlo deliberadamente.

- **Fuente:** The Nugget.

## L.3 — Regla 1/6 de mantenimiento (Tom Merrick)

Se requiere \~1/6 del esfuerzo para MANTENER una habilidad frente a GANARLA. Un nivel logrado con 6 sesiones/semana × 8 semanas se mantiene con \~1 sesión/semana bien diseñada. Útil para planes sostenibles y fases de vida con menos tiempo.

- **Fuente:** Tom Merrick.

# PARTE M — Principios de programación *(Lote 8b)*

## M.1 — Principio SAID (BMC)

Specific Adaptations to Imposed Demands. Cualquier entrenamiento fuera del muro debe tener un puente claro hacia la escalada real (aplicar la ganancia en el muro dentro de pocas semanas). Sin ese puente, las ganancias no se transfieren.

- **Fuente:** BMC TV.

## M.2 — Ley de rendimientos decrecientes (BMC)

Los mismos estímulos generan ganancias cada vez menores. Bill varía deliberadamente el estímulo (ángulo, agarre, intensidad, volumen) cada 4-8 semanas para evitar estancamiento en intermedios/avanzados.

- **Fuente:** BMC TV.

## M.3 — Consistencia como amplificador (Nugget confirma MacLeod)

Múltiples coaches coinciden: la consistencia es el multiplicador más importante. Bill diseña planes que el usuario puede sostener 6+ meses. Un plan "óptimo" que dura 3 semanas y colapsa es peor que uno "razonable" de 6 meses.

- **Fuente:** The Nugget (confirma MacLeod).

# PARTE N — Reglas técnicas adicionales *(Lote 8b)*

## N.1 — Off-Foot Rule / Pie libre perpendicular (Hooper)

En movimientos con un pie cargado y otro libre, el pie libre debe colocarse perpendicular al eje de rotación del cuerpo para contrarrestar el momento de rotación y estabilizar el centro de masa.

- **Fuente:** Hooper's Beta.

## N.2 — Aim Small Miss Small (Hooper)

En movimientos de precisión, apuntar a un punto específico dentro de la presa (un tornillo, el logo) en lugar de "a la presa". Reduce la varianza de aterrizaje en dinámicos.

- **Fuente:** Hooper's Beta.

## N.3 — Last Set Matching (Hooper)

Para romper estancamientos: igualar las reps de las primeras series al número logrado en la ÚLTIMA serie al fallo de la sesión anterior (6-5-4 → siguiente 4-4-4 → cuando sea 4-4-4-4 sin fallo, subir a 5). Progresión graduada que evita el fallo prematuro repetido.

- **Fuente:** Hooper's Beta.

## N.4 — Strengthen then Lengthen (Tom Merrick)

Para ganar rango utilizable, primero fortalecer el músculo antagonista en el rango final del estiramiento, después estirar ("inhibición recíproca"). El rango ganado es utilizable con fuerza, no solo pasivo.

- **Fuente:** Tom Merrick.

## N.5 — Balance de grip real, no ratio 10:1 (Tom Merrick)

La clave no es el ratio tira/empuja, sino la capacidad del tejido vs el estrés impuesto. Bill no obliga a "balancear" por regla ciega — escucha las señales del tejido (dolor, rigidez, sensibilidad) y ajusta según lo que el cuerpo específico tolera.

- **Fuente:** Tom Merrick.

# PARTE O — Seguridad de material *(Lote 8b)*

## O.1 — Nose loading en mosquetones (Magnus)

Un mosquetón cargado correctamente soporta \~22 kN (2,200 kg). "Nose loaded" (carga sobre el gatillo o cerca de la punta) puede fallar a **\~190 kg** — menos del 10% de su capacidad. Chequeo rápido: si al chapar la cuerda queda sobre el gatillo/punta, reacomodarla.

- **Fuente:** Magnus Midtbø.

## O.2 — Higiene de piel: limar para grosor uniforme (Magnus \- Janja)

Limar la piel (no cortarla) para grosor uniforme y evitar flappers y zonas delgadas que sangran. La piel se estresa en transiciones bruscas de grosor. Lima de grano medio, después de escalar, no sobre piel lastimada.

- **Fuente:** Magnus Midtbø.

# PARTE P — Conceptos científicos que informan el entrenamiento *(Lote 8c)*

## P.1 — RFD — velocidad neuronal (Colomer-Poveda 2023\) *(ampliado v3)*

La RFD mide qué tan rápido produces fuerza. En dinámicos y boulder importa más que la fuerza máxima pura. Los élite tienen adaptaciones en el tracto reticuloespinal (RST) — entrenables, no innatas. Para desarrollar RFD: contracción explosiva (dominadas explosivas, campus en avanzados, dinámicos controlados). Las suspensiones estáticas entrenan fuerza máxima pero NO RFD.

**Ventana temporal 50-100 ms (v3):** La RFD funcionalmente relevante para escalada dinámica ocurre en los primeros **50-100 milisegundos** de la contracción — antes de que el músculo alcance su pico de fuerza. Un escalador puede tener excelente fuerza máxima medida en 5 segundos y RFD pobre en 50-100 ms; el segundo predice mejor el rendimiento en boulder de compromiso y dead points. Esto explica por qué dos escaladores con la misma fuerza en hangboard estático rinden muy distinto en dinámicos.

**StartReact (v3):** reflejo neurofisiológico donde un estímulo auditivo o táctil intenso acelera la respuesta motora ya preparada, activando el RST y acortando el tiempo de reacción. En escalada, se manifiesta cuando un escalador "sale" del reposo justo antes de un dead point y la ejecución sale más rápida y coordinada de lo que podía ejecutar en frío. No es entrenable directamente — es una propiedad emergente de un RST bien entrenado. Su relevancia práctica: refuerza que el estímulo explosivo (no las suspensiones estáticas) es lo que construye la infraestructura neural del movimiento rápido.

- **Fuente:** Colomer-Poveda et al. 2023; extensión conceptual v3 con literatura neurofisiológica del RST.

## P.2 — Critical Force (CF) — resistencia real de dedos

Nivel de carga sostenible indefinidamente sin fatigar (equivalente al umbral aeróbico). Se mide con Tindeq u otras plataformas. Bill NO lo calcula sin equipo, pero el concepto informa: cuando el usuario "no aguanta", puede estar escalando por encima de su CF, y la solución es aumentarlo con resistencia específica (ARC, capilarización, HB-REPEAT-LOW), no "aguantar más".

- **Fuente:** Science and Clinical / CAMP4.

## P.3 — IRCRA Scale — estandarización de grados en investigación

La comunidad científica usa IRCRA para estandarizar grados en publicaciones. "Estudio en escaladores IRCRA 20+" ≈ 7c+ francés / V6-V7 boulder (avanzado, no élite mundial).

- **Fuente:** Science and Clinical.

## P.4 — BFR (Blood Flow Restriction) — concepto (no protocolo)

Entrenamiento con restricción de flujo usando cinchas calibradas. Permite adaptaciones de fuerza/hipertrofia con cargas muy bajas (20-30% 1RM), útil en rehabilitación. Bill NO lo asigna: requiere cinchas específicas, presión calibrada, protocolo y supervisión profesional inicial. Se menciona como opción para conversar con fisio.

- **Fuente:** Science and Clinical / CAMP4.

# PARTE Q — Yoga aplicado al escalador *(Lote 8c)*

## Q.1 — Yoga restorativo vs yoga de rendimiento

**Restorativo (recovery):** poses mantenidas 1-3 min, énfasis en respiración y relajación del sistema nervioso — recuperación activa en días de descanso. **De rendimiento (mobility+strength):** carga activa en rangos finales, fuerza en apertura, control neuromuscular — complemento en días bajos. El error común es mezclarlos sin claridad.

- **Fuente:** Yoga with Ieva Luna.

## Q.2 — Respiración 360°

Expansión pulmonar en 3 dimensiones (frente/pecho, laterales/costillas, atrás/espalda) en lugar de solo elevar el pecho. Activa el diafragma completo, mejora el intercambio gaseoso y regula el parasimpático. Complementa ME-001 y Box Breathing 4-4-4. Aplicable en recuperación entre intentos, post-sesión, transición nocturna.

- **Fuente:** Yoga with Ieva Luna.

## Q.3 — Push and Reach — principio de estabilidad

La estabilidad se prueba con la capacidad de EMPUJAR con una base y ALCANZAR con la extremidad opuesta simultáneamente. Si no es estable, hay debilidad en la cadena cruzada (déficit de control anti-rotacional del core). Se entrena con side plank reach, bird dog, o drills en muro.

- **Fuente:** Yoga with Ieva Luna.

# PARTE R — Filosofía del entrenamiento a largo plazo *(Compendio)*

## R.1 — El mito del envejecimiento en escalada

La declinación tras los 30 NO es cronológica: es una transición hacia modelos de entrenamiento menos intensos. La mayoría no "envejece mal" — deja de entrenar bien (deja de hacer fuerza máxima, estímulos progresivos, proyectar). Cuando el estímulo de fuerza se mantiene (adaptado a la edad, con más recuperación), la declinación se minimiza. Hay escaladores encadenando 8c a los 50+ y 8b a los 60+. Bill NUNCA asume que un usuario de 40+/50+ "ya no puede" — la conversación es sobre cómo adaptar el estímulo, no desistir.

- **Fuente:** Compendio Maestro / CAMP4.

## R.2 — Consistencia metabólica (Lattice)

Los planes rígidos "todo o nada" fracasan porque la vida real interfiere. Un plan flexible que permite permutar sesiones sin comprometer la progresión mantiene el estímulo continuo — y es esa continuidad la que produce adaptación. Bill diseña con Plan A (ideal), Plan B (semana normal) y Plan C (semana difícil), los 3 mantienen la dirección.

- **Fuente:** Compendio Maestro / Lattice.

## R.3 — Priorización del RST en movimientos dinámicos

En escalada dinámica y boulder de compromiso, las adaptaciones del RST importan tanto como el área de sección transversal muscular. Estímulos que entrenan RST: dominadas explosivas, campus (en preparados), boulders explícitamente dinámicos, contracciones balísticas breves. Las suspensiones estáticas NO. Bill no integra campus/dynos para principiantes/intermedios bajos (regla 2.9), pero explica por qué el avanzado necesita estímulo explosivo.

- **Fuente:** Compendio Maestro / Colomer-Poveda 2023\.

## R.4 — Hangboard como herramienta de rehabilitación (Esther Smith / Jared Vagy)

El hangboard es superior a la escalada libre para lesiones de dedos porque permite dosificación quirúrgica. La roca es estocástica (cargas variables imposibles de controlar); el hangboard es determinístico. Para reparación de colágeno (mecanotransducción), la dosificación precisa induce adaptación. Durante rehab de polea/tendón, el usuario debe hacer MÁS hangboard estructurado (con protocolo del fisio) y MENOS escalada libre — contraintuitivo pero clínicamente sólido.

- **Fuente:** Compendio Maestro / Esther Smith / Dr. Jared Vagy.

## R.5 — Biomecánica de la muñeca y de los flexores en agarres *(ampliado v3)*

**Posición de muñeca:** La posición de la muñeca modifica la excursión tendinosa de FDS y FDP. **Extensión** (dorsiflexión): reduce tensión — útil como descarga en rehab. **Neutra:** equilibrada. **Flexión** (palmarflexión): aumenta tensión, especialmente en crimp cerrado. Ajustar el ángulo de muñeca es una herramienta activa de rehabilitación — pero siempre en coordinación con el fisio tratante.

**Los dos flexores principales (v3):** el antebrazo tiene dos músculos flexores de los dedos que trabajan de forma distinta según el agarre:

- **FDS (Flexor Digitorum Superficialis):** flexiona la articulación PIP (media). Se recluta especialmente en **half crimp y open hand**, donde la PIP está flexionada pero la DIP (distal) queda relativamente extendida.  
- **FDP (Flexor Digitorum Profundus):** flexiona la articulación DIP (distal, más cerca de la uña). Se recluta especialmente en **open hand puro** (los dedos rectos "colgando" del último tercio) y también en **full crimp** cuando el pulgar bloquea el índice.

**Por qué esto importa para poleas (v3):**

- **Full crimp** carga las poleas anulares A2 y A4 al máximo porque la geometría del arqueo genera fuerzas de bowstring (el tendón intenta separarse del hueso) que las poleas tienen que contener. A2 (base del dedo) es la más común de romper.  
- **Half crimp** carga A2 pero menos que full crimp — el ángulo del tendón contra la polea es menos agudo.  
- **Open hand** distribuye la carga de manera más uniforme entre las poleas y sobre el FDP; por eso es el agarre más seguro para rehabilitación y para la mayoría del volumen de entrenamiento.

**Aplicación práctica:** entrenar variedad de agarres no es solo por transferencia técnica — es porque cada agarre carga poleas y flexores distintos, y variar reduce la exposición repetida sobre las mismas estructuras. Un escalador que solo entrena half crimp acumula estrés desproporcionado sobre A2.

- **Fuente:** Compendio Maestro; literatura anatómica de mano (Schweizer et al.).

## R.6 — Extensor digitorum como fuente de dolor en nudillos

"Dolor en los nudillos" sin trauma claro suele ser patrón de referencia del extensor digitorum (antebrazo dorsal), no la articulación. Manejo: palpar el extensor (tercio proximal dorsal); liberación miofascial; estiramiento del extensor; fortalecimiento gradual con bandas. Bill orienta esto para dolor leve/moderado sin causa clara; dolor agudo o persistente \>2 semanas → validación profesional.

- **Fuente:** Compendio Maestro.

# PARTE S — Las 5 Reglas de Oro del Compendio *(Compendio)*

## S.1 — Prioridad del RST

Las adaptaciones neurales del tracto reticuloespinal son tan determinantes para la potencia como el área de sección transversal muscular. La fuerza que no se produce rápido no es fuerza útil.

## S.2 — Carga progresiva sobre reposo pasivo

La rehabilitación exitosa de poleas y tendones exige carga progresiva bien dosificada para inducir reparación tisular. El reposo absoluto durante semanas es contraproducente para el atleta sin enfermedad sistémica.

## S.3 — Benchmarks fisiológicos sobre grados aspiracionales

Los benchmarks (fuerza en 20 mm, RFD, CF, rango de movimiento) son entrenables y medibles. Los grados llegan como consecuencia. Cuando la métrica principal es el grado, se induce ansiedad y comparación destructiva.

## S.4 — Prevención del RED-S como seguro sistémico

La nutrición adecuada es un seguro contra el fallo fisiológico sistémico. Ignorar este pilar hace que todo el resto sea inversión con retorno decreciente.

## S.5 — Combate al mito del envejecimiento

La capacidad física en la madurez es función del estímulo de fuerza continuo, no de una decadencia biológica predeterminada. Adaptar el estímulo a la edad — no eliminarlo.

- **Fuente:** Compendio Maestro.

# PARTE T — Complementos conceptuales *(v3 nueva)*

Cinco conceptos identificados como faltantes en el corpus conceptual: dos que solo existían como reglas operativas en Doc 02 pero necesitan su "por qué" educativo aquí (Forging vs Sharpening, VBT); y tres que estaban en fuentes del corpus pero sin sección explicativa dedicada (Pacing, Simuladores, Herramientas de benchmarking casero).

## T.1 — Forging vs Sharpening 2:1 (The Nugget)

**Forging** (forjar) es construir la base atlética: fuerza máxima, endurance de base, movilidad, prevención, capacidades generales. **Sharpening** (afilar) es la especificidad hacia un objetivo concreto: sesiones de proyecto, boulder de estilo específico, redpoint táctico, competencia. La proporción óptima en cualquier ciclo es \~**2:1 forjar:afilar**.

**Por qué esta proporción y no otra:** afilar sobre una base pequeña rinde poco y expone al usuario a técnicas específicas de alto riesgo (sesiones máximas en un solo estilo, agarre o ángulo) sin la infraestructura para tolerarlas. Forjar sin afilar deja al usuario "fuerte pero torpe" en su objetivo real. El 2:1 mantiene la base creciendo mientras se cristaliza la especificidad — el error clásico del intermedio motivado es invertir la proporción (afilar demasiado, forjar poco) y estancarse porque la base no crece.

**Cómo lo usa Bill:** en un bloque de 8 semanas, \~5 semanas de forjar \+ 3 de afilar. En proyectos largos, se puede permitir 1:1 puntualmente, pero nunca invertir el ratio. Cuando el usuario reporta estancamiento en un proyecto, la primera pregunta de Bill es "¿cuánta base has forjado en los últimos 3 meses?" — no "¿cuántas veces has probado el proyecto?".

- **Fuente:** The Nugget (Will Anglin).

## T.2 — VBT (Velocity-Based Training) como marcador de fatiga neural

**Qué es:** en ejercicios donde la carga se mueve (dominadas explosivas, deadlifts, press), medir la velocidad del primer rep de la serie y detener la serie cuando la velocidad cae **25-35%** respecto a ese primer rep. La medida se hace con acelerómetro, banda inercial (Vitruve, Chronojump, Beast Sensor) o incluso app de smartphone con video slow-motion.

**Por qué la velocidad revela fatiga neural:** el sistema nervioso central regula qué fibras musculares reclutar y a qué frecuencia disparar. Cuando el SNC empieza a fatigarse, la primera consecuencia observable es la caída de velocidad — antes de que el usuario "sienta" que ya no puede, antes de que la técnica se rompa visiblemente, antes de que las reps al fallo lleguen. Es una señal temprana y **objetiva** de fatiga neural. El error clásico es entrenar por sensación subjetiva: cuando el usuario "sintió" fatiga, ya llevaba 2-3 reps entrenando fatigado y contribuyendo más al desgaste que al estímulo neural.

**Por qué importa para escalada:** la RFD (P.1) es una capacidad neural, no puramente muscular. Entrenarla requiere reps de calidad neural alta, no reps al fallo. Detener la serie con caída de velocidad del 25-35% preserva el estímulo neural sin desgaste innecesario, permite más series de calidad, y reduce el riesgo de compensaciones técnicas (agarre desviado, escápula colapsada) que aparecen bajo fatiga.

**Cuándo NO aplica:** hipertrofia (donde el fallo cercano importa), resistencia de fuerza (donde el sostén es el estímulo), sesiones de "empuja hasta que ya no puedas" con propósito específico. Aplica sobre todo en trabajo neural: dominadas explosivas, campus (para preparados), press explosivos, dead point drills.

- **Fuente:** Climb Strong (Steve Bechtel — divulgación del VBT en escalada); literatura de VBT en ciencias del deporte.

## T.3 — Pacing — dosificación del ritmo en ruta

**Qué es:** la velocidad de progresión a través de una ruta, medida como movimientos por minuto y ajustada consciente y activamente durante la escalada. Un buen pacing no es "escalar rápido" ni "escalar lento" — es escalar a la velocidad que la ruta y el estado del escalador requieren.

**Los dos errores clásicos:**

- **Escalar demasiado rápido:** el escalador principiante ansioso "corre" por la ruta buscando salir del compromiso. Consume energía en movimientos apresurados, no lee la ruta durante la escalada, no encuentra reposos, llega bombeado al crux con la mitad de la ruta por delante.  
- **Escalar demasiado lento:** el escalador que analiza cada movimiento en secciones no analíticas. Se agota manteniendo posiciones estáticas mientras "piensa". Especialmente costoso en desplome, donde el tiempo suspendido es carga acumulada.

**Reglas de pacing (Compendio \+ Hooper):**

- En **secciones de reposo o placa**: escalar más lento, restaurar respiración, planear los siguientes movimientos.  
- En **secciones de compromiso o desplome**: escalar más rápido para minimizar tiempo bajo carga.  
- En **cruxes**: pausa breve para ejecutar la secuencia planeada, luego ejecutar sin dudar.  
- Test de auto-diagnóstico: si el escalador termina la ruta con reservas físicas pero encadenó — pacing bien. Si terminó bombeado y falló — probablemente pacing mal (demasiado tiempo en secciones fáciles o demasiado rápido en cruxes).

**Por qué es una variable entrenable:** el pacing es una capacidad perceptivo-motora, no una constante fisiológica. Se entrena con onsight de rutas al límite (donde no hay memoria de secuencia y hay que decidir el ritmo en tiempo real) y con visualización previa que incluye explícitamente el ritmo (no solo la secuencia).

- **Fuente:** Compendio Maestro; Hooper's Beta; principios de Michailov sobre gestión de carga isométrica.

## T.4 — Simuladores — replicar el proyecto en entorno controlado

**Qué son:** dispositivos, home walls, board specs o secuencias replicables diseñadas para reproducir los movimientos, ángulos y agarres específicos de un proyecto real, en un entorno donde el escalador puede repetir sin la variabilidad de la roca. Ejemplos:

- Home walls que replican el ángulo y el sistema de agarres del proyecto outdoor.  
- Moonboard/Kilterboard con problemas que replican secuencias clave.  
- Setup específico con presas caseras para replicar el crux exacto.  
- Grabación en video del intento para revisar y volver a intentar el "simulador" con la beta corregida.

**Por qué funcionan:** la escalada real es estocástica — cada intento en roca tiene variabilidad de fricción, condiciones, aproximación mental. Los simuladores eliminan esa variabilidad y permiten trabajar el gesto motor puro, la secuencia y el compromiso. Se pueden repetir 5-10 veces en una sesión, mientras que el proyecto real permite tal vez 2-3 intentos serios.

**Trade-offs a explicar (Training4Climbing):**

- **Ventaja:** máxima densidad de práctica sobre el gesto específico, aislado de variabilidad ambiental.  
- **Riesgo:** el simulador NUNCA es idéntico al proyecto (presa "casi igual" no es la presa, ángulo "muy parecido" no es el ángulo). Un escalador que solo entrena en simulador y no visita la roca puede pulir un gesto que no transfiere.  
- **Regla de uso:** simulador \~70% del trabajo específico de proyecto \+ roca real \~30% para calibrar la transferencia. No inversamente.

**Cuándo Bill lo sugiere:** cuando el usuario reporta proyecto real inaccesible (distancia, condiciones, temporada) y tiene acceso a home wall o board comercial. Bill puede orientar la construcción del setup, pero no dicta cómo poner presas — eso requiere criterio del usuario/coach sobre el proyecto concreto.

- **Fuente:** Training4Climbing; Compendio Maestro.

## T.5 — Herramientas de benchmarking casero

**Qué son:** dispositivos accesibles al usuario individual para medir fuerza de dedos, resistencia y CF de manera reproducible en casa, sin requerir laboratorio ni supervisión profesional continua. El corpus identifica una familia principal:

- **Tindeq Progressor:** dispositivo comercial con app. Mide MVC (fuerza máxima isométrica), RFD, Critical Force. Precio 300-400 USD. Es la referencia práctica en el mercado hispanohablante.  
- **MetacarpEdge:** dispositivo alternativo, similar en función a Tindeq. Menos difundido.  
- **Beastmaker \+ báscula con lastre:** setup casero de bajo costo. Suspenderse en 20 mm/15 s con lastre progresivo hasta encontrar el máximo. Menos preciso que Tindeq pero suficiente para tracking longitudinal.  
- **Cronómetro \+ regleta 25 mm:** el más básico. Tiempo máximo de suspensión en 25 mm como criterio de elegibilidad para hangboard (López-Rivera). No mide fuerza absoluta pero es umbral operativo.

**Por qué Bill los menciona pero no obliga:** el benchmarking casero permite al usuario tener métricas objetivas de progreso (P.3, S.3) sin depender de gimnasios especializados o profesionales para cada sesión. Es especialmente valioso para usuarios en LATAM donde el acceso a coaches especializados o labs es limitado. Pero:

- **Bill no vende ni recomienda una marca específica** como necesaria. La regla es: la métrica es más importante que la herramienta.  
- **Bill no requiere que el usuario tenga estas herramientas** para armar planes. Los planes por defecto usan métricas subjetivas (RPE, sensación de bomba, consistencia 9/10) y métricas de campo básicas (tiempo en 25 mm).  
- **Bill sugiere herramientas específicas** solo cuando el usuario ya está en un nivel donde el benchmarking objetivo aporta (avanzado, con proyectos definidos, con presupuesto para invertir en tracking).

**Uso responsable:** un usuario con Tindeq y sin coach puede sobrentrenarse persiguiendo números. El benchmarking es data — sigue requiriendo interpretación. Bill educa sobre esto explícitamente.

- **Fuente:** Compendio Maestro; Lattice; comunidad de práctica en el corpus.

# GLOSARIO RÁPIDO (referencia)

- **ARC:** Aerobic Restoration and Capillarisation. Escalada continua a muy baja intensidad.  
- **Aero Cap:** capacidad aeróbica específica del antebrazo.  
- **Aero Pow:** potencia aeróbica. Circuitos largos con pump alto.  
- **An Cap:** capacidad anaeróbica. Secuencias duras de 10-15 movimientos.  
- **An Pow:** potencia anaeróbica. Boulders cortos con descanso incompleto.  
- **BFR:** Blood Flow Restriction. Restricción de flujo sanguíneo.  
- **Crimp:** agarre en regleta pequeña. Variantes: open hand, half crimp, full crimp.  
- **CF (Critical Force):** carga de dedos sostenible indefinidamente sin fatigar.  
- **Dead-hang:** suspensión estática en hangboard.  
- **FDP (Flexor Digitorum Profundus):** músculo flexor del antebrazo que actúa sobre la articulación DIP de los dedos. Reclutado en open hand.  
- **FDS (Flexor Digitorum Superficialis):** músculo flexor del antebrazo que actúa sobre la articulación PIP de los dedos. Reclutado en half crimp.  
- **IntHangs / Repeaters:** suspensiones intermitentes.  
- **IRCRA:** escala estandarizada de grados para investigación.  
- **LEA:** Low Energy Availability. Baja disponibilidad energética.  
- **MaxHangs:** suspensiones de fuerza máxima.  
- **MIFS:** Maximal Isometric Finger Strength.  
- **MVC / MVIC:** Maximal Voluntary (Isometric) Contraction.  
- **Onsight:** encadenar a vista, sin información previa.  
- **Pacing:** dosificación del ritmo (velocidad de progresión) durante la escalada.  
- **Power endurance:** sostener esfuerzos intensos 45 s \- 5 min.  
- **Pump / bomba:** acumulación de desechos metabólicos en el antebrazo.  
- **RED-S:** Relative Energy Deficiency in Sport.  
- **Redpoint:** encadenar tras varios intentos de trabajo.  
- **RFD:** Rate of Force Development.  
- **RPE:** Rate of Perceived Exertion. Esfuerzo percibido 1-10.  
- **RST:** tracto reticuloespinal (vía neural de producción rápida de fuerza).  
- **StartReact:** reflejo neurofisiológico que acelera respuesta motora preparada tras estímulo intenso.  
- **SubHangs:** suspensiones submáximas.  
- **TUT:** Time Under Tension.  
- **VBT:** Velocity-Based Training. Uso de la velocidad de la carga como marcador de fatiga neural.

# Instrucciones de uso para Claude desarrollador

1. **Chunking para vector store:** dividir en chunks de \~300-500 palabras respetando los headers (cada sub-sección — B.1, F.3, R.4, T.2, etc. — es un chunk natural). Incluir el título de la sección en cada chunk.  
2. **Metadatos por chunk:** parte (A-T \+ glosario), subsección, fuentes citadas.  
3. **Este documento NO contiene dosis prescribibles.** Para "cuántas series" o "qué descanso", Bill consulta la Sheet 01, no este RAG.  
4. **Refrescar trimestralmente.** Literatura nueva (revisiones 2025+, RED-S, periodización femenina) → actualizar y re-indexar.  
5. **Versionar.** Cada cambio mayor → bump de versión y log de cambios.  
6. **Colisiones resueltas en esta consolidación:** la antigua "PARTE F — Glosario" se movió al final (GLOSARIO RÁPIDO); las nuevas partes temáticas ocupan F-T. La subsección de boulder outdoor (antes mislabel "E.5") es ahora C.10.  
7. **Cambios de v3:**  
   - Nueva Parte T (T.1 a T.5): Forging vs Sharpening, VBT, Pacing, Simuladores, Herramientas de benchmarking.  
   - Ampliación P.1: añadida ventana 50-100 ms de RFD y concepto StartReact.  
   - Ampliación R.5: añadida biomecánica FDS/FDP con carga sobre poleas A2/A4.  
   - Glosario ampliado con FDS, FDP, Pacing, StartReact, VBT.

