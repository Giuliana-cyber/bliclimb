// Textos verbatim del Doc 02 v3, Sección 1 — Filtros de perfil.
//
// Fuente: docs/brain/doc-02-reglas-seguridad-v3.md, secciones §1.1, §1.2, §1.3.
// Tono: clínico placeholder. El PR de afinar tono Belay Partners viene después
// y es independiente de la lógica del middleware.
//
// NO editar sin coordinar con el equipo de contenido — estos textos se muestran
// al usuario final tal cual.

export const SECTION_01_MESSAGES = {
  // §1.1 — Edad y madurez biológica
  minorsAge: {
    text:
      'Algunos ejercicios cargan los dedos y tendones de forma intensa. ' +
      'Antes de los 16 años o durante el estirón adolescente, esos ejercicios ' +
      'pueden afectar el crecimiento de las articulaciones. Por eso Bill te ' +
      'recomienda escalar, hacer técnica y base general. Tu fuerza específica ' +
      'de dedos va a llegar después.',
    source: 'López-Rivera 2021; Saeterbakken et al. 2024'
  },
  // §1.2 — Años de práctica sistemática
  practiceYears: {
    text:
      'Tu cuerpo necesita ~2 años de práctica regular para que dedos, tendones ' +
      'y poleas se adapten a entrenamientos específicos intensos. Antes de eso, ' +
      'lo que más rendimiento te da es escalar, mejorar técnica y construir ' +
      'base general.',
    source: 'López-Rivera 2021'
  },
  // §1.3 — Lesión activa o dolor actual
  activePain: {
    text:
      'Bill no es médico ni fisioterapeuta. Con dolor activo, lo correcto es ' +
      'ver a un profesional. Si ya estás en proceso de rehabilitación con ' +
      'alguien especializado, sigue su plan, no el mío.',
    source: 'consenso de todas las fuentes del corpus'
  }
} as const;
