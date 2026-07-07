// Capa B — limpieza determinística de atribuciones EXPLÍCITAS y
// ESTRUCTURADAS en el texto que el LLM recibe del RAG.
//
// Filosofía (Giuliana + Claude, 2026-07-07):
//   Conservador. Solo remover lo estructurado y confiable:
//     - Líneas "Fuente:" / "Source:" / etc.
//     - Secciones "Referencias" / "Bibliografía".
//     - Frases "según el estudio de X" / "según X et al.".
//   Los nombres sueltos en frases (ambiguos: "Método Hörst" puede ser
//   nombre de método, no cita) los cubre la Capa A (prompt de Bill).
//   Defensa en profundidad: B limpia lo determinístico, A el resto.
//
// La metadata de fuente NO se toca — vive en `LibraryTraceability.sourceNames`
// extraída aparte. Solo se saca del texto que llega al LLM downstream.

// Etiquetas de línea completa que gatean strip del renglón entero.
const LINE_PREFIX_LABELS = [
  'fuente',
  'fuentes',
  'source',
  'sources',
  'referencia',
  'referencias',
  'reference',
  'references',
  'bibliografia',
  'bibliografía',
  'bibliography',
  'cita',
  'citas'
] as const;

// Encabezados de sección (markdown headings) que abren un bloque de
// referencias. Todo lo que sigue hasta la próxima heading o línea vacía
// duplicada se strippea.
const SECTION_HEADING_LABELS = [
  'referencias',
  'referencia',
  'references',
  'bibliografia',
  'bibliografía',
  'bibliography',
  'fuentes',
  'fuentes citadas',
  'works cited',
  'citas'
] as const;

/**
 * Normaliza para comparar labels sin importar tildes / mayúsculas.
 */
function normalizeLabel(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function lineStartsWithLabel(line: string): boolean {
  // "Fuente: ..." / "Fuentes: ..." con opcional whitespace/bullet inicial.
  const match = line.match(/^\s*(?:[-*•]\s+)?([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\s*:/);
  if (!match) return false;
  return LINE_PREFIX_LABELS.includes(normalizeLabel(match[1]) as never);
}

function lineIsSectionHeading(line: string): boolean {
  // "# Referencias" / "## Bibliografía" / "### Fuentes citadas".
  const match = line.match(/^\s*#{1,6}\s+(.+?)\s*$/);
  if (!match) return false;
  return SECTION_HEADING_LABELS.includes(normalizeLabel(match[1]) as never);
}

function lineIsBoldSectionHeading(line: string): boolean {
  // "**Referencias**" / "**Bibliografía:**".
  const match = line.match(/^\s*\*\*(.+?)\*\*:?\s*$/);
  if (!match) return false;
  return SECTION_HEADING_LABELS.includes(normalizeLabel(match[1]) as never);
}

// -------------------- API pública --------------------

export type SanitizeResult = {
  cleaned: string;
  stats: {
    linesStripped: number;
    sectionsStripped: number;
    phrasesReplaced: number;
  };
};

/**
 * Aplica los strips de Capa B sobre `text`. Devuelve el texto limpio +
 * conteos para logging.
 *
 * Reglas:
 *   1. Líneas que comienzan con "Fuente:" / "Source:" / etc. → strip línea.
 *   2. Secciones bajo heading "Referencias" / "Bibliografía" → strip
 *      desde el heading hasta el próximo heading, blank-line-double o EOF.
 *   3. Frases "según el estudio de X" / "según X et al." → reemplazadas
 *      por "según la evidencia" para preservar continuidad de sentido.
 */
export function stripExplicitAttributions(text: string): SanitizeResult {
  if (!text || typeof text !== 'string') {
    return {
      cleaned: '',
      stats: { linesStripped: 0, sectionsStripped: 0, phrasesReplaced: 0 }
    };
  }

  let linesStripped = 0;
  let sectionsStripped = 0;
  let phrasesReplaced = 0;

  // --- Paso 1: strip líneas Fuente:/Source:/etc + secciones Referencias/... ---
  const lines = text.split('\n');
  const out: string[] = [];
  let inRefSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ¿Estamos dentro de una sección de referencias?
    if (inRefSection) {
      // Salimos al toparnos con un nuevo heading que NO sea de referencias.
      if (line.match(/^\s*#{1,6}\s+/) && !lineIsSectionHeading(line)) {
        inRefSection = false;
        out.push(line);
        continue;
      }
      // Salimos si hay una línea vacía SEGUIDA de contenido no-lista (heurística
      // conservadora: dos blancos seguidos, o blank + contenido normal).
      if (line.trim() === '' && i + 1 < lines.length) {
        const next = lines[i + 1];
        const nextIsList = /^\s*(?:[-*•]|\d+\.)\s+/.test(next);
        if (!nextIsList && next.trim() !== '') {
          inRefSection = false;
          out.push(line);
          continue;
        }
      }
      // Estamos dentro de referencias: strippear.
      continue;
    }

    // ¿Abre una sección de referencias?
    if (lineIsSectionHeading(line) || lineIsBoldSectionHeading(line)) {
      inRefSection = true;
      sectionsStripped++;
      continue;
    }

    // ¿Línea "Fuente:" / "Source:" / etc?
    if (lineStartsWithLabel(line)) {
      linesStripped++;
      continue;
    }

    out.push(line);
  }

  let cleaned = out.join('\n');

  // --- Paso 2: reemplazo de frases atribucionales ---
  //
  // "según el estudio de X" / "según los estudios de X" /
  // "según el paper de X" / "según la investigación de X" /
  // "según X et al." / "como muestra el estudio de X" / etc.
  //
  // Reemplazamos por "según la evidencia" para no dejar frase huérfana.
  // Solo capitalizamos "Según" si la coincidencia venía capitalizada.
  // Nombre propio de autor: letra mayúscula Unicode seguida de letras/apellido.
  // \p{L} matchea toda letra Unicode (incluye ö, ü, ñ, á, í, etc.).
  const AUTHOR = `\\p{Lu}[\\p{L}\\-']+`;
  const YEAR_OPT = `(?:\\s*,?\\s*\\(?\\d{4}\\)?)?`;
  const ET_AL_OPT = `(?:\\s+et\\s+al\\.?)?`;

  // NOTA: usamos \\s+ (matches newlines) en vez de espacio literal para
  // capturar frases que quedan cortadas entre dos líneas — común en RAG
  // porque los chunks vienen con wrap arbitrario.
  const PHRASE_PATTERNS: Array<[RegExp, (m: string) => string]> = [
    // "según (el/los/la/las) (estudio/paper/investigación/artículo) de [Autor]..."
    [
      new RegExp(
        `(seg[uú]n|de acuerdo con|como muestra)\\s+(?:el\\s+|los\\s+|la\\s+|las\\s+)?(?:estudios?|papers?|investigaciones?|art[ií]culos?)\\s+de\\s+${AUTHOR}${ET_AL_OPT}${YEAR_OPT}`,
        'giu'
      ),
      (m) =>
        m.startsWith('S') || m.startsWith('D') || m.startsWith('C')
          ? 'Según la evidencia'
          : 'según la evidencia'
    ],
    // "según [Autor] et al. (año)" — atrapa cuando NO hay "estudio de" pero sí "et al."
    [
      new RegExp(`(seg[uú]n)\\s+${AUTHOR}\\s+et\\s+al\\.?${YEAR_OPT}`, 'giu'),
      (m) => (m.startsWith('S') ? 'Según la evidencia' : 'según la evidencia')
    ]
  ];

  for (const [pattern, replacer] of PHRASE_PATTERNS) {
    cleaned = cleaned.replace(pattern, (match) => {
      phrasesReplaced++;
      return replacer(match);
    });
  }

  // Colapsa 3+ blank lines dejadas por strips a 2 (mantiene separación de
  // párrafos pero no huecos gigantes).
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trimEnd();

  return {
    cleaned,
    stats: { linesStripped, sectionsStripped, phrasesReplaced }
  };
}
