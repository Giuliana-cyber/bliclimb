# Bill v2 — Reglas de Seguridad (CONSOLIDADO v3)

**Propósito de este documento:** Estas son las reglas que el motor de Bill debe ejecutar de forma determinista, no como búsqueda semántica. Cada una tiene una condición, una acción y un mensaje al usuario. El Claude desarrollador las traduce a código (idealmente en una capa de validación que corre antes y después de cada recomendación de plan o respuesta de chat). NO van en el vector store de OpenAI.

**Cómo está organizado:** catorce secciones, ordenadas de filtros más amplios (onboarding) a señales más específicas (en tiempo real durante una sesión), cerrando con reglas de programación avanzada, autorregulación, proyectación, efectos objetivos, métricas de progreso y dosificación/consistencia.

**Fuentes principales:** López-Rivera 2021, Saeterbakken et al. 2024, Hörst (How to Climb 5.12), Monedero et al. 2023, Arellano-Aparicio et al. 2025, Michailov 2014, Deyhle et al. 2015, Ilgner (Guerreros de la Roca), Lattice, Power Company, Climb Strong, HMB, Hooper's Beta, BMC, The Nugget, Magnus Midtbø, Compendio Maestro (Lattice/CAMP4), Merrick, MacLeod.

**Nota de consolidación (v3):** integra las Secciones 1-13 previas \+ nueva **Sección 14 (Reglas de dosificación y consistencia)** con adiciones de Merrick (1/6 maintenance, 10:1 grip balance), MacLeod (9/10 consistency) y Hörst APM (ventana temporal 1h/2h). Correcciones cosméticas: emojis del semáforo RED-S (Sec 8.1) reemplazados por texto plano.

---

## Sección 1 — Filtros de perfil (onboarding obligatorio)

Estos campos deben capturarse en el onboarding y revisarse periódicamente. Sin estos datos, Bill no puede recomendar nada que no sea contenido educativo.

### 1.1 — Edad y madurez biológica

- **Condición:** usuario \< 16 años, O usuario que reporta estar en pico de crecimiento adolescente.  
- **Acción:** bloquear todo el canal Hangboard/Fingerboard, todo el canal Campus Board, ejercicios FM-014 HIT, todos los ejercicios con prefijo CB-, todo lo etiquetado como "full crimp" o "regletas pequeñas". Mantener disponible: técnica, calentamientos, escalada general, base física, flexibilidad.  
- **Mensaje al usuario:** "Algunos ejercicios cargan los dedos y tendones de forma intensa. Antes de los 16 años o durante el estirón adolescente, esos ejercicios pueden afectar el crecimiento de las articulaciones. Por eso Bill te recomienda escalar, hacer técnica y base general. Tu fuerza específica de dedos va a llegar después."  
- **Fuente:** López-Rivera 2021; Saeterbakken et al. 2024\.

### 1.2 — Años de práctica sistemática

- **Condición:** usuario reporta menos de 2 años escalando/entrenando sistemáticamente 2-3 días/semana.  
- **Acción:** bloquear hangboard intenso, MaxHangs, IntHangs/Repeaters, Campus Board, HIT, dominadas con lastre, todos los tests máximos.  
- **Mensaje al usuario:** "Tu cuerpo necesita \~2 años de práctica regular para que dedos, tendones y poleas se adapten a entrenamientos específicos intensos. Antes de eso, lo que más rendimiento te da es escalar, mejorar técnica y construir base general."  
- **Fuente:** López-Rivera 2021\.

### 1.3 — Lesión activa o dolor actual

- **Condición:** usuario reporta dolor activo en dedos, poleas, muñeca, codo, hombro o cuello.  
- **Acción:** bloquear todo entrenamiento específico del área afectada. Sólo permitir ejercicios marcados explícitamente como "rehabilitación con supervisión profesional" Y mostrar disclaimer obligatorio.  
- **Mensaje al usuario:** "Bill no es médico ni fisioterapeuta. Con dolor activo, lo correcto es ver a un profesional. Si ya estás en proceso de rehabilitación con alguien especializado, sigue su plan, no el mío."  
- **Fuente:** consenso de todas las fuentes del corpus.

### 1.4 — Cribado RED-S / baja disponibilidad energética

- **Condición:** usuario responde positivo a screening (amenorrea sospechada, conductas alimentarias preocupantes, LEAF-Q positivo, pérdida de peso reciente preocupante).  
- **Acción:** bloquear todo entrenamiento de alta intensidad (campus, hangboard máximo, HIT, power endurance, RT con cargas máximas, 4x4, tests de fatiga). Sólo permitir contenido educativo y derivación profesional.  
- **Mensaje al usuario:** "Lo que describes puede ser una señal de algo importante para tu salud. Bill no puede ayudarte con esto sola — un profesional especializado en salud y deporte es lo que necesitas. Si quieres, te muestro recursos."  
- **Fuente:** Monedero et al. 2023 (88% disponibilidad subóptima, 28% LEA en avanzadas/élite); Saeterbakken et al. 2024\.

### 1.5 — Embarazo

- **Condición:** usuaria reporta embarazo.  
- **Acción:** todo plan requiere validación médica previa. Bill no genera plan automatizado.  
- **Mensaje al usuario:** "El embarazo cambia cómo tu cuerpo responde al entrenamiento de forma muy individual. Bill no puede generarte un plan sin que tu médico lo apruebe."  
- **Fuente:** principio general de prudencia médica.

---

## Sección 2 — Bloqueos por ejercicio (gating)

Cada ejercicio del inventario de la Sheet de Ejercicios tiene una columna "Validación profesional" y "Publicable app". Estas reglas operan a nivel ejercicio individual.

### 2.1 — Test de elegibilidad para hangboard (25 mm / 15 s)

- **Condición:** antes de desbloquear cualquier ejercicio del canal Hangboard, el usuario debe haber pasado este test.  
- **Acción:** si tiempo \< 15 s en regleta de 25 mm → bloquear hangboard, recomendar escalada técnica como estímulo suficiente. Si ≥ 15 s → desbloquear ejercicios marcados "intermedio" en Hangboard, manteniendo otros filtros activos.  
- **Mensaje al usuario:** "Si todavía no puedes colgarte 15 segundos en una regleta de 25 mm, escalar normal ya te da el mismo estímulo en los dedos. Cuando llegues a ese punto, abrimos el hangboard."  
- **Fuente:** López-Rivera 2021\.

### 2.2 — Filtro full crimp

- **Condición:** ejercicio etiquetado como full crimp.  
- **Acción:** sólo desbloquear si nivel \= avanzado Y sin historial de lesión de polea Y \>2 años de práctica. Mostrar advertencia obligatoria.  
- **Mensaje al usuario:** "El full crimp da más control en agarres muy pequeños, pero también es la posición de dedos que más estresa las poleas. Úsalo poco, con cuidado, y nunca con dolor."  
- **Fuente:** López-Rivera 2021\.

### 2.3 — Filtro campus board

- **Condición:** cualquier ejercicio con prefijo CB-.  
- **Acción:** bloquear si nivel \= principiante o intermedio bajo. Desbloquear sólo si: avanzado Y test 25mm/15s pasado Y sin dolor activo Y calentamiento específico completado.  
- **Mensaje al usuario:** "El campus board es uno de los entrenamientos más exigentes que existen. Hasta que tengas base sólida de fuerza, te va a hacer más daño que bien."  
- **Fuente:** Saeterbakken et al. 2024; Michailov 2014\.

### 2.4 — Regla del bloqueo unilateral (one-arm lock-off)

- **Condición:** ejercicio FT-006 o equivalente.  
- **Acción:** desbloquear sólo si usuario completa ≥15 dominadas estrictas por serie. Antes de eso, programar bloque de dominadas como preparación.  
- **Mensaje al usuario:** "El bloqueo a una mano necesita mucha fuerza de tracción de base. Vamos a construir esa base primero con dominadas."  
- **Fuente:** Hörst (How to Climb 5.12).

### 2.5 — Tests máximos (MIFS, ST, ET, E1/E2, Fit-Climbing, 1RM pull-up, MVC dedos)

- **Condición:** cualquier test marcado como máximo o "hasta fallo".  
- **Acción:** sólo en modo "evaluación avanzada" del menú, nunca como parte de un plan diario automático. Requiere: calentamiento específico completado, sin dolor activo, sin ejercicio vigoroso 24h antes, descanso adecuado.  
- **Mensaje al usuario:** "Los tests máximos son útiles para medir tu progreso, pero no son entrenamiento. Hazlos cuando estés fresca y sin dolor, y no más de cada 4-8 semanas."  
- **Fuente:** Torr et al. 2022, López-Rivera & González-Badillo 2019, Bertuzzi et al.

### 2.6 — Tests máximos con dinamómetro (MVIC codo / hombro / dedos) *(Mega-batch 5\)*

- **Condición:** cualquier test marcado como MVIC.  
- **Acción:** sólo en modo "evaluación avanzada" del menú con validación profesional activa en el perfil. NUNCA como parte de plan diario automático. Requiere: calentamiento específico completado, sin dolor activo, sin ejercicio vigoroso 24h antes, descanso adecuado.  
- **Mensaje al usuario:** "Los tests máximos miden tu progreso, no son entrenamiento. Hazlos cuando estés fresca, sin dolor, y cada 4-8 semanas máximo. Si no estás en modo evaluación, Bill no los asigna."  
- **Fuente:** Deyhle et al. 2015; Torr et al. 2022\.

### 2.7 — Filtro highball outdoor (boulder) *(Mega-batch 6\)*

Si el usuario reporta principiante O outdoor sin spotter/pads adecuados:

- Bloquear cualquier ejercicio etiquetado "highball" o problemas con altura \>3.5m sin asegurador.  
- Bloquear si reporta "no hay revisión del descenso" o "roca húmeda".  
- **Mensaje:** "El highball requiere experiencia para gestionar caídas controladas. No es por miedo — es por física: una caída desde \>3.5m sobre roca rara vez es benigna sin pads, spotters y técnica de aterrizaje."  
- **Fuente:** Flanagan (Bouldering for Beginners).

### 2.8 — Filtro full crimp expandido *(Mega-batch 6\)*

Además del filtro de la regla 2.2:

- En tests de fuerza máxima de dedos (MIFS), Bill **NUNCA** permite full crimp ni 3-finger drag — solo half crimp o open hand (estandarización de Torr et al. y seguridad).  
- Para entrenamiento, full crimp solo se desbloquea con: nivel avanzado \+ sin historial polea \+ sin dolor activo \+ completar progresión de familiarización (mano sola sin carga → con pies en suelo → ambas manos con peso corporal).  
- **Fuente:** Torr et al. 2022\.

### 2.9 — Filtro obligatorio de edad para hangboard/campus *(Lote 8a)*

Bill bloquea automáticamente para usuarios menores de 16 años:

- Todo hangboard con lastre añadido  
- Campus board dinámico  
- Full crimp cargado  
- Fuerza máxima con lastre (pull-ups lastradas, deadlift límite)  
- Cualquier ejercicio con arqueo intenso cargado

Motivo: riesgo en placas epifisarias durante crecimiento. Para 16-18 años: requiere confirmación explícita de supervisión de coach cualificado.

- **Fuente:** Training4Climbing / Hörst.

### 2.10 — Hombro asintomático en resonancia *(Lote 8c)*

Si un usuario reporta que en una resonancia le encontraron "anormalidades" en el hombro (bursitis, tendinopatía leve, pinzamiento subacromial menor) pero NO tiene dolor ni pérdida de fuerza, Bill:

- NO reduce automáticamente la carga de entrenamiento  
- NO alarma al usuario  
- Explica que hallazgos en imagen son comunes y frecuentemente asintomáticos incluso en personas sin dolor  
- Recomienda evaluación clínica funcional (no solo imagen) si hay duda

El hallazgo en imagen sin síntomas no es una lesión clínica activa.

- **Fuente:** Grassroots Physical Therapy / The Climbing Doctor.

### 2.11 — Recordatorio Shoulder Flossing (HE-FLOSS) *(Lote 8c)*

Cuando Bill asigna HE-FLOSS: incluir la regla "si los brazos se doblan durante el movimiento, aumentar la distancia entre las manos en la banda". Doblar los codos hace el ejercicio "más fácil" pero elimina el estímulo real del rango de la cápsula del hombro.

- **Fuente:** Yoga with Ieva Luna.

---

## Sección 3 — Reglas de programación de sesión

Estas reglas operan cuando Bill arma una sesión combinando varios ejercicios.

### 3.1 — Orden de la sesión por intensidad

- **Regla:** dentro de una sesión, el orden de bloques siempre es: calentamiento → técnica/aprendizaje motor → fuerza máxima (incluyendo hangboard) → boulder/potencia → power endurance → resistencia/continuidad → vuelta a la calma/flexibilidad.  
- **Por qué:** los esfuerzos de mayor calidad neural se hacen en estado fresco; los aeróbicos toleran fatiga acumulada.  
- **Fuente:** Hörst, Barrows.

### 3.2 — Habilidades nuevas en los primeros 30 minutos

- **Regla:** cuando una sesión incluye aprendizaje motor nuevo, va en los primeros \~30 minutos. Habilidades ya conocidas pueden ir con fatiga moderada.  
- **Fuente:** Hörst (How to Climb 5.12).

### 3.3 — No 3 días seguidos

- **Regla:** Bill no programa 3 días consecutivos de entrenamiento intenso. Si el usuario ya entrenó 2 días seguidos, el día 3 es descanso o sesión suave.  
- **Fuente:** Hörst (How to Climb 5.12).

### 3.4 — Recuperación entre sesiones intensas según tipo

- **Endurance baja intensidad:** \~24 h entre sesiones.  
- **Boulder máximo / fuerza máxima:** 48-72 h entre sesiones del mismo grupo muscular.  
- **Power endurance al fallo / 4x4:** hasta 5 días para recuperación completa.  
- **Hangboard MaxHangs:** 48-72 h mínimo.  
- **Campus board:** 48-72 h mínimo.  
- **Fuente:** Hörst, Barrows, López-Rivera.

### 3.5 — Ratio práctica:rendimiento 3:1

- **Regla:** salvo en élites, por cada 1 sesión de "ir a rendir" (tratar de encadenar al límite) hay 3 sesiones de práctica deliberada (trabajar debilidades sin presión).  
- **Fuente:** Hörst (How to Climb 5.12).

### 3.6 — Hangboard antes de escalar

- **Regla:** si la sesión incluye hangboard, va después del calentamiento y antes del bloque principal de escalada — nunca después del bloque principal con dedos fatigados.  
- **Fuente:** López-Rivera 2021\.

### 3.7 — Semana de descarga obligatoria

- **Regla:** después de cada bloque de 8-9 semanas de entrenamiento estructurado, Bill programa una semana de descanso completo. Para volver, requiere check-in subjetivo "100%". Si no, 3-14 días adicionales.  
- **Fuente:** Hörst, López-Rivera & González-Badillo 2019\.

### 3.8 — Orden de capacidades en macrociclo

- **Regla:** la fuerza se entrena antes que la resistencia. Las capacidades aeróbicas se construyen antes que las potencias. Aero Cap necesita 8+ semanas mínimo para adaptación.  
- **Fuente:** Barrows, Hörst, López-Rivera.

### 3.9 — Anaerobic capacity requiere base aeróbica

- **Regla:** no programar bloques de anaerobic capacity / power endurance sin haber construido antes una base aeróbica de al menos 6 semanas.  
- **Por qué:** sin capacidad aeróbica, el lactato no se gestiona y el entrenamiento empeora el rendimiento en vez de mejorarlo.  
- **Fuente:** Barrows.

### 3.10 — Frecuencia máxima de días duros

- **Regla:** máximo 3 días por semana de "energy systems duros" (An Cap, An Pow, Aero Pow). El resto es base, técnica, o descanso.  
- **Fuente:** Barrows.

### 3.11 — Ratio práctica:rendimiento por objetivo del día *(Mega-batch 6\)*

Cuando Bill asigna sesión de muro/roca, debe preguntar el objetivo: "Practicar" o "Rendir". Para principiante/intermedio, ratio recomendado **3:1**. Avanzados hasta 2:1. Élites lo invierten en periodos de competición.

- **Fuente:** Hörst (How to Climb 5.12).

### 3.12 — Ratio onsight:redpoint *(Mega-batch 6\)*

Cuando hay rutas adecuadas al grado, favorecer **onsight 2:1** sobre redpoint. El abuso de redpoint duro desmoraliza, no enseña y aumenta riesgo de lesión.

- **Fuente:** Hörst (How to Climb 5.12).

### 3.13 — Triplicar descanso en intentos serios de redpoint el mismo día *(Mega-batch 6\)*

Cuando el usuario va a intentar encadenar (no trabajar la ruta), descanso entre intentos \= **3× el normal** (15-30 min en lugar de 5-10). Bill no acorta esto para "encajar más intentos".

- **Fuente:** Hörst (How to Climb 5.12).

### 3.14 — Home wall NO es para uso diario *(Mega-batch 6\)*

Si el usuario reporta acceso a home wall, Bill bloquea sesiones de muro 4+ días/semana en home wall. Máximo 3 días/semana con al menos 1 día de descanso entre ellos. El home wall es trampa de sobreuso porque "está ahí siempre".

- **Fuente:** Hörst (How to Climb 5.12).

### 3.15 — Bill nunca prescribe pérdida de peso *(Mega-batch 7\)*

Bill **NUNCA** asigna planes de pérdida de peso, déficit calórico, ayuno intermitente, dieta keto, ni recomendaciones de "bajar X kg para mejorar grado". Si el usuario lo pide: "Bajar peso como objetivo de rendimiento está asociado con riesgos serios (RED-S, lesión, ciclo menstrual). La evidencia para que el bajo peso mejore rendimiento en escaladores élite es conflictiva. Bill recomienda consultar con un nutricionista deportivo antes de tomar esa decisión." Regla dura — no se modifica por insistencia, contexto cultural ("la escalada premia los flacos"), ni preferencia del usuario.

- **Fuente:** Monedero et al. 2023\.

### 3.16 — Balance energético la mayoría de días *(Mega-batch 7\)*

Principio general: igualar ingesta diaria con gasto diario la mayoría de los días. Periodos cortos (1-2 días/semana) de balance ligeramente negativo pueden ser aceptables, pero no deben dominar la semana. Bill nunca asigna déficits sostenidos como herramienta.

- **Fuente:** Monedero et al. 2023\.

### 3.17 — Screening previo a bloques intensos *(Mega-batch 7\)*

Antes de asignar un bloque con FM-, CB-, HB-intenso, PE-, RF-, PO- a intensidad alta, Bill aplica el checklist:

- ¿Estás durmiendo 7+ horas la mayoría de noches?  
- ¿Sientes que recuperas bien entre sesiones?  
- ¿Tu energía se mantiene estable durante el día?  
- (Si aplica) ¿Tu ciclo menstrual ha sido regular en los últimos 3 meses?  
- ¿Has tenido pérdida de peso no planificada recientemente?  
- ¿Has tenido dolor óseo persistente o lesiones que tardan en sanar?

Si hay 2+ respuestas problemáticas → semáforo amarillo automático. Si hay amenorrea o dolor óseo → semáforo rojo.

- **Fuente:** Saeterbakken et al. 2024; Monedero et al. 2023\.

### 3.18 — Escalada \> entrenamiento (regla 75/25) *(Lote 8a)*

Proporción global: \~75% del tiempo escalando (técnica en muro/roca), \~25% entrenando (fuerza, movilidad, gimnasio). Ajustes: principiantes 85/15; intermedios 75/25; avanzados en periodos de fuerza específica temporalmente 60/40 (nunca sostenido).

- **Fuente:** Climb Strong; Training4Climbing.

### 3.19 — Regla de dolor 2/10 en rehabilitación *(Lote 8b)*

Durante cualquier protocolo de rehabilitación (polea, epicondilitis, tendinopatía, post-cirugía), el dolor máximo permitido durante el ejercicio y en las 24 h posteriores es 2/10. Si aumenta por encima de 2/10 durante → reducir carga inmediatamente. Si aparece/aumenta \>2/10 en 24 h post → reducir carga en la siguiente sesión. Si persiste \>2/10 más de 48 h → parar el protocolo y consultar al profesional tratante.

- **Fuente:** Hooper's Beta (Jason Hooper DPT).

### 3.20 — Regla de los "dos elementos" *(Lote 8b)*

En una sola sesión, Bill no combina más de DOS tipos de entrenamiento de alta intensidad. (Fuerza máxima \+ boulder límite \= OK; \+ hangboard intenso \= NO.) Los elementos de baja intensidad (ARC, técnica ligera, movilidad) no cuentan.

- **Fuente:** BMC TV.

---

## Sección 4 — Señales de detener (en tiempo real)

Mensajes que Bill debe mostrar cuando el usuario reporta cualquiera de estas señales durante o después de un ejercicio. La acción es: detener el ejercicio, no continuar la sesión sin reportar, sugerir descanso o consulta profesional según el caso.

### 4.1 — Dolor articular o tendinoso (no muscular)

- **Aplica a:** todos los ejercicios.  
- **Acción:** detener inmediatamente. No es "fatiga normal". Sugerir descanso y, si persiste \>48h, consulta profesional.  
- **Diferencia clave:** dolor muscular \= tolerable y esperado. Dolor articular, tendinoso o agudo \= parar.

### 4.2 — Sensación de tirón o "chasquido" en dedos

- **Aplica a:** hangboard, campus, boulder con regletas pequeñas, full crimp.  
- **Acción:** detener, no volver a cargar el dedo afectado, derivar a profesional. Posible lesión de polea.

### 4.3 — Pérdida de control en movimientos dinámicos

- **Aplica a:** boulder, campus, dinámicos.  
- **Acción:** detener el bloque. Indica fatiga neural alta, riesgo de caída descontrolada.

### 4.4 — Bomba "terminal" en ARC / Aero Cap

- **Aplica a:** sesiones de continuidad / resistencia aeróbica.  
- **Acción:** bajar intensidad o terminar el bloque. La bomba debe ser sostenible, no al borde del fallo.

### 4.5 — Fatiga técnica acumulada

- **Aplica a:** todas las sesiones.  
- **Acción:** si la técnica se degrada visible (movimientos torpes, agarres mal tomados, pérdida de coordinación), detener el bloque.

### 4.6 — Mareo, náusea, dolor de cabeza durante esfuerzo

- **Aplica a:** todas las sesiones, especialmente tests máximos y power endurance.  
- **Acción:** detener inmediatamente. Sentarse. Hidratar. Si persiste, atención médica.

### 4.7 — Dolor de codo durante tracción, escalada o pesas *(Mega-batch 5\)*

- **Aplica a:** todas las dominadas, lock-offs, ejercicios de pesas para tren superior, escalada intensa.  
- **Acción:** detener el bloque inmediatamente. Reducir frecuencia de ejercicios previos. Sustituir bloque siguiente por ejercicios de empuje (antagonistas) si el patrón se repite. Si persiste \>7 días: derivar a profesional.  
- **Diferencia clave:** dolor en zona del epicóndilo (externo) o epitróclea (interno) suele indicar tendinopatía por sobreuso. Es señal temprana que sí responde a reducir carga; ignorarla la cronifica.

---

## Sección 5 — Cribados de salud sistémica

Preguntas que Bill debe hacer en onboarding y revisar periódicamente (cada 1-3 meses). No son diagnóstico — son detección para derivación.

### 5.1 — Disponibilidad energética

- Preguntas tipo LEAF-Q sobre amenorrea, alimentación restrictiva, fatiga persistente, fracturas recientes. Si positivo: bloquear alta intensidad \+ derivar.

### 5.2 — Historial de lesión de polea

- Si reporta lesión de polea pasada (aunque resuelta): nunca desbloquear full crimp ni regletas \<15 mm sin validación profesional explícita.

### 5.3 — Historial de epicondilitis / dolor crónico de codo *(ampliado en Mega-batch 5\)*

- Si reporta historial: priorizar trabajo de **antebrazo antagonista** (reverse wrist curls / extensores) ANTES de añadir volumen de tracción. Reducir frecuencia inicial de dominadas y lock-offs hasta haber completado 4 semanas de prevención de extensores sin síntomas.  
- **Filtro adicional:** bloquear forearm extensor curls pesados (5-10 reps con carga alta) — sólo permitir versión preventiva (3×25 ligero).

### 5.4 — Sueño y recuperación

- Pregunta diaria/semanal: horas de sueño, energía percibida. Si \<7h consistente: reducir intensidad programada automáticamente.

---

## Sección 6 — Mensajes de seguridad y derivación profesional

Textos que Bill usa cuando aplica una regla. Tono Belay Partners: directo, sin alarmismo, sin tecnicismos innecesarios.

### 6.1 — Derivación a profesional de salud

"Bill no es médico, fisioterapeuta ni nutriólogo. Cuando algo entra en su territorio, te lo digo claro: ve con un profesional. No es porque no quiera ayudar, es porque ayudar mal puede ser peor que no ayudar."

### 6.2 — Cuando se bloquea un ejercicio por nivel

"Este ejercicio no es 'malo'. Es que tu cuerpo todavía no está listo para él. Te muestro qué construir primero para llegar allí de forma segura."

### 6.3 — Cuando hay dolor activo

"Con dolor, lo correcto es entender qué pasa antes de seguir entrenando. Un fisio o médico deportivo puede ahorrarte semanas o meses de problemas. Mientras tanto, podemos trabajar lo que no afecte la zona."

### 6.4 — Cuando alguien quiere un plan de élite

"Los planes de los climbers de élite están diseñados para sus cuerpos, su historial y su volumen de práctica. Aplicarlos directo sin esa base es la receta para lesionarse. Vamos a construir un plan que se parezca al tuyo."

### 6.5 — Retirada como decisión táctica válida *(Mega-batch 6\)*

"Retirarse en escalada no es fracasar. Es decidir, con la información que tienes en el momento, que el riesgo o el coste no se ajusta a lo que viniste a buscar hoy. Esa decisión protege tu cuerpo, tu tiempo y tu motivación para volver. Bill la respeta." Aplica cuando: usuario reporta cansancio extremo, miedo no gestionado, protección dudosa outdoor, o simplemente decide no seguir. Bill no insiste.

- **Fuente:** Ilgner (Guerreros de la Roca).

---

## Sección 7 — Protocolo educativo de retorno tras lesión de polea *(Mega-batch 5\)*

**Importante:** esta sección NO es un protocolo prescribible por Bill. Es información educativa que Bill puede mostrar cuando el usuario pregunta sobre retorno tras lesión de polea, siempre acompañada de derivación a profesional.

### 7.1 — Protocolo Hörst de 6 fases (informativo)

Fuente: Hörst, *How to Climb 5.12*. Tiempo total estimado: hasta 6 meses en casos severos.

- **Fase 1 — Cesar escalada hasta desaparecer dolor e inflamación.** Mientras dura: ejercicios para resto del cuerpo permitidos.  
- **Fase 2 — Dos semanas adicionales de descanso completo de dedos.** Aunque el dolor haya desaparecido.  
- **Fase 3 — Dos semanas de carga muy baja con squeeze device o putty terapéutica.**  
- **Fase 4 — Un mes escalando rutas en muro vertical con agarres grandes (cubos, jugs).** SIN regletas, SIN crimp, SIN desplome.  
- **Fase 5 — Un mes escalando agarres grandes en desplome.** Volumen progresivo.  
- **Fase 6 — Retorno gradual a intensidad normal.** Si reaparecen síntomas: volver a Fase 4\.

### 7.2 — Cómo lo usa Bill

- **NUNCA** como plan asignado.  
- **NUNCA** sin acompañar de "esto es educativo, ve con un fisioterapeuta antes de cualquier fase".  
- Bloqueado para mostrar si el usuario no reporta lesión de polea previa o no pregunta directamente.  
- Si el usuario reporta dolor activo de polea: NO mostrar este protocolo, derivar inmediatamente.

### 7.3 — Por qué Bill puede mostrarlo

Es información ampliamente publicada (libro comercial de divulgación Hörst). El valor de Bill no es la información — es el contexto: "esto existe, pero TU caso necesita fisioterapeuta antes de seguirlo".

---

## Sección 8 — Semáforo de Riesgo RED-S *(Mega-batch 7\)*

**ESTA SECCIÓN ES LA MÁS CRÍTICA QUE BILL HA TENIDO HASTA AHORA.** RED-S es un síndrome con consecuencias reales (fracturas por estrés, osteoporosis temprana, amenorrea crónica, lesiones recurrentes, bajo rendimiento sostenido). Bill debe operar este semáforo de forma obligatoria.

### 8.1 — Evaluación del semáforo

Bill aplica este semáforo en onboarding y luego cada 4 semanas, o cuando aparezcan señales:

**SEMÁFORO VERDE — Energía estable, sin señales de riesgo**

- Energía percibida estable día a día; recuperación normal entre sesiones; sin señales de RED-S; sin restricción alimentaria activa; sin preocupación obsesiva por peso.  
- → Bill puede asignar todo según protocolos normales.

**SEMÁFORO AMARILLO — Señales tempranas o factores de riesgo**

- Fatiga persistente sin causa clara; recuperación lenta; ingesta irregular (saltar comidas); objetivo de bajar peso para "rendir mejor"; pérdida de peso no planificada \>5% en últimos 3 meses; irregularidad menstrual leve; resfriados frecuentes.  
- → Bill bloquea hangboard intenso, campus board, fuerza máxima nueva, power endurance. Mantiene técnica \+ mental \+ movilidad. Mensaje educativo sobre RED-S obligatorio. Recomendación de consulta nutricional preventiva.

**SEMÁFORO ROJO — Señales clínicas de RED-S**

- Amenorrea (ausencia de menstruación 3+ meses consecutivos); dolor óseo localizado y persistente; fractura por estrés sospechada o confirmada; EAT-26 \>20; LEAF-Q ≥8 (en mujeres); historial de TCA diagnosticado activo; pérdida de peso rápida (\>10% en 3 meses) sin causa médica.  
- → Bill **bloquea todas las progresiones intensas**. Mantiene solo movilidad suave \+ trabajo mental fuera de pared \+ actividades de bajo impacto. Mensaje obligatorio: "Estas señales requieren valoración médica y nutricional antes de avanzar. Bill no es sustituto de profesional de salud."

### 8.2 — Bloqueos derivados del semáforo

- **Semáforo amarillo bloquea:** FM-XXX (fuerza máxima), CB-XXX (campus), HB- intenso, PE-/RF- intenso, BO-001 BO-002 (boulder máxima/PE Michailov), PO-CAMPUS-WALL.  
- **Semáforo rojo bloquea:** todo lo anterior \+ escalada \>5 días/semana \+ cualquier programa de "mejorar grado rápido".

### 8.3 — Activación del semáforo

- En onboarding (obligatorio para todos los perfiles); en check-in mensual; cuando el usuario reporta cualquier señal amarilla/roja; antes de cualquier "fase intensa" o bloque nuevo de fuerza máxima; cuando el usuario menciona "perder peso" como objetivo (activación automática).  
- **Fuente:** Monedero et al. 2023; Arellano-Aparicio et al. 2025; Saeterbakken et al. 2024\.

---

## Sección 9 — Reglas del módulo Mental *(Mega-batch 7\)*

### 9.1 — El miedo razonable no se "supera" con técnicas mentales

Cuando el usuario aplica ejercicios mentales sobre un miedo, Bill primero verifica si es razonable o no razonable: ¿La caída es segura? ¿La protección es adecuada? ¿Hay piedra suelta / humedad / aterrizaje malo? ¿La vía está dentro del nivel? Si alguna respuesta indica peligro real, Bill NO ofrece técnicas mentales para "superar" ese miedo. Recomienda ajustar la decisión táctica (TA-003, "retirada como decisión válida").

- **Fuente:** Hörst (How to Climb 5.12); Ilgner (Guerreros de la Roca).

### 9.2 — Visualización debe ser factual, detallada y positiva

Bill nunca asigna visualización si el usuario no tiene información real de la vía (beta, secuencia conocida, observación previa). Pregunta antes: "¿Tienes beta suficiente o has observado la vía?"

- **Fuente:** Hörst (How to Climb 5.12).

### 9.3 — El entrenamiento mental no sustituye instrucción

Mensaje estándar de cierre del módulo mental: "El entrenamiento mental no sustituye instrucción técnica, juicio de seguridad ni supervisión profesional. Si sientes pánico, bloqueo, dolor, fatiga alta o inseguridad objetiva, detén la actividad. Si tienes trauma o ansiedad incapacitante, busca apoyo de profesional de salud mental especializado."

### 9.4 — Foco singular no debe comprometer seguridad

Cuando Bill asigna ME-006 (foco singular), siempre incluye: "Mantén siempre atención mínima a seguridad — pies, equilibrio, cuerda, chapaje, asegurador. Si pierdes la sensación de control, abandona el ejercicio de foco."

### 9.5 — Si deja de ser divertido, parar

Si el usuario reporta repetidamente (3+ check-ins consecutivos) frustración, falta de motivación, "se siente como trabajo", Bill sugiere: "La fuente que más respeto (Hörst) recomienda tomar unas semanas de descanso cuando la búsqueda de grado deja de ser divertida. La motivación es un recurso renovable, pero hay que cuidarlo. Bill puede pausar el plan estructurado por 2-4 semanas si quieres."

- **Fuente:** Hörst (How to Climb 5.12).

---

## Sección 10 — Sobreuso y autorregulación *(Lote 8a \+ 8b)*

### 10.1 — La estadística Lattice: 94% de lesiones son por sobreuso

El análisis de datos de Lattice Training (\>50k escaladores) identifica que el 94% de las lesiones en escalada son por sobreuso, no por trauma agudo. Bill prioriza la autorregulación por encima de "cumplir el plan".

- **Fuente:** Lattice Training (Olly Power).

### 10.2 — Regla de los 10 minutos

Si a los 10 minutos de iniciar la actividad el usuario se siente peor de lo esperado (fatiga anormal, mareo, dolor emergente, energía muy baja), detener la sesión. Aplica especialmente en recuperación de enfermedad reciente, señal de posible embarazo (solo si el usuario lo indica), sospecha de inicio de lesión.

- **Fuente:** Lattice; Dave MacLeod.

### 10.3 — Regla del resfriado común

Ante síntomas de resfriado activo, Bill: reduce volumen total; sustituye alta intensidad anaeróbica por baja intensidad aeróbica (movilidad, técnica ligera, ARC muy suave); si hay fiebre, dolor torácico, síntomas cardíacos o respiratorios severos: bloqueo total hasta recuperación completa.

- **Fuente:** Dave MacLeod.

### 10.4 — Seven Try Rule

En sesiones de proyecto (boulder o redpoint), si tras 7 intentos honestos no hay progreso medible, Bill sugiere abandonar el problema por hoy. Progreso medible: llegar 1 movimiento más lejos, tocar la próxima presa (aunque no la retengas), mejor lectura. NO cuenta: "casi lo hago" subjetivo.

- **Fuente:** Power Company Climbing (Kris Hampton).

### 10.5 — Regla VBT (velocidad como control de fatiga)

Ejercicios con velocidad medible (dominadas explosivas): si la velocidad cae 25-35% respecto al primer rep, detener la serie. La caída de velocidad es señal fiable de fatiga neural.

- **Fuente:** Climb Strong (Steve Bechtel \- VBT).

### 10.6 — Contraste de carga día-a-día

Para usuarios que entrenan 4+ días/semana, Bill alterna días pesados y ligeros. Evita días pesados consecutivos.

- **Fuente:** Climb Strong.

### 10.7 — Regla del descanso 2× *(Lote 8b)*

En sesiones de proyecto o boulder límite, descansar al menos el DOBLE del tiempo empleado escalando el intento. Para intentos serios cerca del límite (RPE 9-10), descansar 3-5× el tiempo escalado. El error común es descansar por sensación subjetiva cuando el SNC sigue fatigado.

- **Fuente:** Magnus Midtbø (regla popularizada por Yves Gravelle).

---

## Sección 11 — Reglas sobre proyectación *(Lote 8a)*

### 11.1 — Kill Criteria: States and Dates

Antes de comprometerse con un proyecto de \>3 sesiones, Bill enseña al usuario a definir criterios objetivos de abandono antes de empezar. Ejemplos: "Si no toco la próxima presa clave en 5 sesiones, abandono"; "Si aparece dolor en dedos que persiste 48h post-sesión, abandono". Definir kill criteria antes evita el sesgo del coste hundido. En escalada, ese error tiene costo físico real.

- **Fuente:** Power Company.

### 11.2 — If-Then Intentions para momentos críticos

En vías/proyectos con punto de decisión mental identificado, formar una intención si-entonces antes del intento: "SI llego al reposo antes del crux, ENTONCES respiro 3 veces y muevo pie derecho a la presa X". Pre-programa una respuesta automática cuando aparece un gatillo previsible.

- **Fuente:** Power Company.

---

## Sección 12 — Efectos objetivos que Bill comunica *(Lote 8b)*

### 12.1 — Impacto de la deshidratación en rendimiento

Bill educa sobre datos objetivos que muchos escaladores ignoran:

- **2%** de deshidratación corporal → pérdida \~2% de fuerza  
- **2%** de deshidratación → pérdida \~3% de potencia  
- **2%** de deshidratación → pérdida \~10% de resistencia

En sesiones largas (\>90 min) o clima cálido, la hidratación es una variable de rendimiento tan importante como la fuerza. Bill sugiere: una pérdida \>2% del peso corporal durante la sesión indica que la ingesta de agua fue insuficiente.

- **Fuente:** Hooper's Beta.

---

## Sección 13 — Métricas y filosofía de progreso

*Nota: estas reglas fueron numeradas como "4.x" en distintos lotes (RPE, 2/3 forjar/afilar, benchmarks) pero no son señales de detener en tiempo real. Se reagrupan aquí para evitar colisión con la Sección 4\.*

### 13.1 — RPE como métrica principal, grados como referencia *(Lote 8a — originalmente "4.5")*

Bill registra RPE (esfuerzo percibido 1-10) para cada intento serio y lo usa como métrica principal de intensidad. Los grados quedan como referencia. Crítico en: ciclo menstrual (carga tolerable varía por fase), recuperación post-enfermedad, días de baja energía. Escala Hazel Finley (HMB): si un intento fue 4/10, el siguiente debe ser 6/10 para trabajar capacidad de lucha.

- **Fuente:** HMB (Hazel Finley); Catalyst.

### 13.2 — Regla 2/3 Forjar vs 1/3 Afilar *(Lote 8b — originalmente "4.6")*

En cualquier ciclo, la proporción entre "forjar" (base atlética: fuerza máxima, endurance, movilidad, prevención) y "afilar" (especificidad de proyecto) debe ser \~2:1. 8 semanas de bloque → \~5 forjar \+ 3 afilar. El error común es invertir la proporción (proyectar demasiado sobre base insuficiente).

- **Fuente:** The Nugget (Will Anglin).

### 13.3 — Benchmarks fisiológicos \> grados aspiracionales *(Compendio — originalmente "4.7")*

Cuando un usuario reporta "quiero encadenar 7c este año", Bill responde en dos capas: (1) reconocer el objetivo motivacional; (2) convertirlo en benchmarks fisiológicos concretos entrenables y medibles (fuerza en 20 mm como % del peso corporal, resistencia en repeaters, movilidad de cadera 90/90). Los grados no se entrenan directamente; los benchmarks sí.

- **Fuente:** Compendio Maestro / CAMP4.

### 13.4 — RED-S como misdiagnóstico frecuente de "plateau" *(Compendio)*

El RED-S es frecuentemente misdiagnosticado como "plateau de rendimiento" o "falta de motivación". Cuando un escalador reporta "lleva meses estancado", "ya no disfruta tanto", "está siempre cansado", antes de ajustar el entrenamiento Bill considera RED-S no detectado. Preguntas de check-in: "¿Estás comiendo suficiente para tu volumen?"; "¿Has tenido pérdida de peso reciente aunque no sea intencional?"; "¿Cómo está tu energía fuera del entrenamiento?" Si 2+ respuestas problemáticas → activar screening del semáforo RED-S (Sección 8).

- **Fuente:** Compendio Maestro / Marisa Michael.

---

## Sección 14 — Reglas de dosificación y consistencia *(v3 nueva)*

Reglas que gobiernan **cuánto**, **cada cuánto** y **cuán consistente** debe ser el entrenamiento para que produzca la adaptación esperada. Complementan las secciones 3 (programación de sesión) y 10 (autorregulación).

### 14.1 — Regla de mantenimiento 1/6 (Merrick)

Después de un ciclo de ganancia (típicamente 6-8 semanas de fuerza máxima o hangboard), la fuerza adquirida puede **mantenerse con aproximadamente 1/6 del volumen de entrenamiento del ciclo original**. Esto significa que un escalador que hizo 6 sesiones/semana durante el ciclo puede mantener con 1 sesión/semana. Aplica siempre que la intensidad se mantenga alta; el estímulo se pierde si se reduce intensidad además de volumen.

- **Condición operativa:** al terminar un bloque de ganancia y entrar en fase de proyecto o competición, Bill asigna sesiones de mantenimiento \~1/6 del volumen del ciclo previo, manteniendo la misma intensidad relativa.  
- **Por qué importa:** los usuarios tienden a abandonar completamente el entrenamiento de fuerza cuando entran en fase de proyecto → pierden la ganancia adquirida en 4-6 semanas.  
- **Fuente:** Ryan Merrick (Merrick Training) / Climb Strong.

### 14.2 — Regla de balance de agarre 10:1 (Merrick)

Para prevención de epicondilitis / tendinopatía de codo, la proporción volumen semanal de trabajo **extensor : flexor** debe estar cercana a **1:10** (por cada 10 unidades de trabajo de flexores/tracción, 1 unidad de extensores). Como la escalada real produce ratios de 30:1 o peores (todo es tracción), Bill compensa activamente añadiendo trabajo específico de extensores.

- **Condición operativa:** en cualquier plan que incluya ≥3 sesiones/semana de escalada o hangboard/dominadas, Bill programa automáticamente:  
  - Reverse wrist curls: 2 × 15-20 reps con carga baja, 2-3 veces/semana (\~RE-003 en Sheet 01\)  
  - Rice bucket o extensores con banda: 1 vez/semana como opción de recuperación  
- **Mensaje al usuario:** "En escalada, todo tira de los flexores. Los extensores del antebrazo casi nunca se trabajan y esa asimetría es la principal causa de epicondilitis. Bill te añade una micro-dosis semanal — pocos minutos, mucha protección."  
- **Regla dura:** si el usuario tiene historial de epicondilitis (Sec 5.3), esta compensación es **obligatoria**, no opcional.  
- **Fuente:** Ryan Merrick (Merrick Training).

### 14.3 — Regla de consistencia 9/10 (MacLeod)

**9 de cada 10 sesiones planeadas ejecutadas → ganancia. 7-8 de 10 → mantenimiento. Menos de 7 de 10 → pérdida gradual.** Esta regla convierte la consistencia en una métrica objetiva que Bill monitorea directamente.

- **Condición operativa:** Bill lleva registro de sesiones planeadas vs sesiones completadas en ventanas móviles de 10 sesiones (típicamente \~3-4 semanas). Al alcanzar la ventana:  
  - **≥9 completadas:** confirmar plan, considerar progresión de carga  
  - **7-8 completadas:** mantener carga actual, no progresar; revisar factores de vida (sueño, estrés, viajes)  
  - **≤6 completadas:** **reducir volumen del plan** para adaptarlo a lo que el usuario realmente puede sostener. Un plan que no se ejecuta no entrena.  
- **Mensaje al usuario cuando cae bajo 7/10:** "Tu plan actual no encaja con tu vida ahora mismo. En vez de que sigas fallando el plan, prefiero que tengamos uno más pequeño que sí puedas cumplir. Un plan que ejecutas 9 veces vale más que uno que ejecutas 5."  
- **Por qué importa:** evita el patrón de "usuario abandona la app porque siente que fracasa el plan". Bill se adapta al usuario, no al revés.  
- **Fuente:** Dave MacLeod (9 out of 10 climbers).

### 14.4 — Ventana temporal de sesión técnica: 1h óptima, 2h máximo (Hörst APM)

La calidad del aprendizaje motor se degrada con la fatiga. Para sesiones donde el objetivo es **técnica/aprendizaje motor** (no rendimiento ni fuerza), Bill aplica ventanas duras:

- **Óptimo:** \~1 hora de escalada real (tiempo cronometrado en pared, no tiempo total de gimnasio).  
    
- **Techo duro:** 2 horas de escalada real. Más allá, la fatiga degrada la técnica más rápido de lo que se consolida el aprendizaje.  
    
- **Aprendizaje motor nuevo:** en los primeros \~30 minutos (Regla 3.2 ya existente); **retención bajo fatiga moderada:** puede seguir hasta la ventana de 1-2h.  
    
- **Condición operativa:** en sesiones etiquetadas "Modo Práctica" (Sec 3.11), Bill inicia un temporizador de tiempo real de escalada (no tiempo total). A los 60 min: sugerir consolidar bloque; a los 120 min: cerrar sesión aunque el plan tenga más previsto.  
    
- **Mensaje al usuario a los 60 min:** "Vas 1 hora de escalada real. Es el punto óptimo de aprendizaje. Si sigues, tu técnica va a empezar a degradarse — mejor consolidar con algo conocido o cerrar."  
    
- **Mensaje al usuario a los 120 min:** "Techo de aprendizaje técnico alcanzado. Escalar más va a enseñarte técnica peor. Bill cierra la sesión aquí."  
    
- **Por qué importa:** contrarresta el mito común "más horas \= mejor" que produce sobreuso técnico y estanca aprendizaje.  
    
- **Fuente:** Hörst (How to Climb 5.12); Orth, Davids & Seifert (Coordination in climbing).

---

## Notas para Claude desarrollador

1. **Estas reglas son determinísticas.** Implementar como middleware que valida cada plan generado antes de mostrarlo. Si un plan viola una regla, no se muestra — se regenera.  
     
2. **Orden de precedencia:** filtros de perfil (sección 1\) \> bloqueos por ejercicio (sección 2\) \> reglas de programación (sección 3). Una regla de sección 1 puede invalidar permisos de sección 2\. El semáforo RED-S (sección 8\) opera con máxima prioridad tras la sección 1\.  
     
3. **Logging obligatorio:** cuando una regla bloquea algo, logear: qué regla, qué ejercicio, qué usuario, qué mensaje se mostró.  
     
4. **Mensajes son data, no código.** Mantener los textos (sección 6 y mensajes de las secciones nuevas) en una tabla editable, no hardcodeados.  
     
5. **Citar la fuente en el log interno** cuando una regla da dosis, para auditoría futura.  
     
6. **Numeración:** esta versión resolvió colisiones históricas en la Sección 4\. Al versionar cambios, mantener el bloque "Sección 13" para reglas de métrica/filosofía y no reintroducir "4.7+" para reglas que no sean señales de detener.  
     
7. **Reglas de v3 (Sección 14\) requieren datos que Bill aún no captura por defecto:**  
     
   - 14.1: requiere metadata de "fin de ciclo" y transición a mantenimiento  
   - 14.2: requiere trigger automático al detectar ≥3 sesiones/semana de tracción  
   - 14.3: requiere contador móvil de sesiones planeadas vs completadas (ventana 10 sesiones)  
   - 14.4: requiere temporizador de "tiempo real de escalada" separado del "tiempo total de sesión"

   

   Coordinar con la definición del schema de sesiones antes de implementar.

