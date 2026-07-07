import { describe, expect, it } from 'vitest';
import { stripExplicitAttributions } from './citation-sanitizer';

describe('stripExplicitAttributions — líneas "Fuente:" y variantes', () => {
  it('strippea línea "Fuente: X"', () => {
    const input = 'Contenido útil.\nFuente: Lattice Training 2020';
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toBe('Contenido útil.');
    expect(r.stats.linesStripped).toBe(1);
  });

  it('strippea "Source:" en inglés', () => {
    const r = stripExplicitAttributions('Info.\nSource: Hörst 2016');
    expect(r.cleaned).toBe('Info.');
    expect(r.stats.linesStripped).toBe(1);
  });

  it('strippea "Fuentes:" plural', () => {
    const r = stripExplicitAttributions('Blabla.\nFuentes: A, B, C');
    expect(r.cleaned).toBe('Blabla.');
  });

  it('strippea "Referencia:" al inicio de línea', () => {
    const r = stripExplicitAttributions('Cosa.\nReferencia: paper X');
    expect(r.cleaned).toBe('Cosa.');
  });

  it('strippea bullet con "Fuente:" ("- Fuente: X")', () => {
    const r = stripExplicitAttributions('- Contenido\n- Fuente: Lattice');
    expect(r.cleaned).toBe('- Contenido');
  });

  it('NO strippea líneas que solo mencionan "fuente" en prosa', () => {
    const input =
      'La fuente principal de fatiga es la carga de dedos acumulada.';
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toBe(input);
    expect(r.stats.linesStripped).toBe(0);
  });

  it('NO strippea "Fuente" sin dos puntos', () => {
    const input = 'Fuente única identificable no es lo mismo que confiable.';
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toBe(input);
  });
});

describe('stripExplicitAttributions — secciones de referencias', () => {
  it('strippea sección "## Referencias" hasta el final', () => {
    const input = `Contenido A.

## Referencias
- López-Rivera 2021
- Hörst 2016`;
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toBe('Contenido A.');
    expect(r.stats.sectionsStripped).toBe(1);
  });

  it('strippea sección "## Bibliografía" y sigue con contenido posterior', () => {
    const input = `Intro.

## Bibliografía
- Item 1
- Item 2

## Conclusión
Cierre importante.`;
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toContain('Intro.');
    expect(r.cleaned).toContain('Cierre importante');
    expect(r.cleaned).toContain('## Conclusión');
    expect(r.cleaned).not.toContain('Item 1');
    expect(r.cleaned).not.toContain('Bibliografía');
  });

  it('strippea encabezado en bold "**Referencias**"', () => {
    const input = `Contenido.

**Referencias**
- Something`;
    const r = stripExplicitAttributions(input);
    expect(r.cleaned.trim()).toBe('Contenido.');
  });

  it('encabezados de otros temas no se tocan', () => {
    const input = `## Introducción
Texto.

## Seguridad
Advertencias.`;
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toContain('## Introducción');
    expect(r.cleaned).toContain('## Seguridad');
    expect(r.stats.sectionsStripped).toBe(0);
  });
});

describe('stripExplicitAttributions — frases "según el estudio de X"', () => {
  it('reemplaza "según el estudio de López-Rivera 2021"', () => {
    const input = 'Según el estudio de López-Rivera 2021, los dedos necesitan 48h.';
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toContain('Según la evidencia');
    expect(r.cleaned).not.toContain('López-Rivera');
    expect(r.stats.phrasesReplaced).toBe(1);
  });

  it('reemplaza "según los estudios de Barrows"', () => {
    const input = 'según los estudios de Barrows, el ratio es 3:1.';
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toContain('según la evidencia');
    expect(r.cleaned).not.toContain('Barrows');
  });

  it('reemplaza "según Hörst et al. 2016"', () => {
    const input = 'según Hörst et al. 2016, la recuperación es clave.';
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toContain('según la evidencia');
    expect(r.cleaned).not.toContain('Hörst');
  });

  it('matchea frase cortada entre dos líneas (Según\\nHörst et al. 2016)', () => {
    // Común en chunks RAG: wrap arbitrario del texto original.
    const input = 'El descanso incompleto reduce la respuesta. Según\nHörst et al. 2016, hay evidencia clara.';
    const r = stripExplicitAttributions(input);
    // Input arranca con "Según" mayúscula → output "Según la evidencia".
    expect(r.cleaned).toContain('Según la evidencia');
    expect(r.cleaned).not.toContain('Hörst');
    expect(r.stats.phrasesReplaced).toBe(1);
  });

  it('preserva capitalización inicial en el reemplazo', () => {
    const r = stripExplicitAttributions('Según el paper de Kikuchi et al., el volumen importa.');
    expect(r.cleaned.startsWith('Según')).toBe(true);
  });

  it('NO reemplaza "según mi criterio"', () => {
    const input = 'Según mi criterio, hoy conviene descansar.';
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toBe(input);
    expect(r.stats.phrasesReplaced).toBe(0);
  });

  it('NO toca "Método Hörst" (nombre de método, no cita)', () => {
    const input = 'El Método Hörst pauta 3 días de fuerza por semana.';
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toBe(input);
    expect(r.stats.phrasesReplaced).toBe(0);
  });

  it('NO toca nombres de ejercicios ("MaxHang", "frenchies")', () => {
    const input =
      'MaxHang 20mm 4x7seg. Frenchies a 90° para bloqueos isométricos.';
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toBe(input);
  });
});

describe('stripExplicitAttributions — casos límite', () => {
  it('texto vacío → cleaned vacío, stats en 0', () => {
    const r = stripExplicitAttributions('');
    expect(r.cleaned).toBe('');
    expect(r.stats.linesStripped).toBe(0);
    expect(r.stats.sectionsStripped).toBe(0);
    expect(r.stats.phrasesReplaced).toBe(0);
  });

  it('no-string → cleaned vacío (defensivo)', () => {
    const r = stripExplicitAttributions(null as unknown as string);
    expect(r.cleaned).toBe('');
  });

  it('colapsa 3+ blank lines a 2 tras strips', () => {
    const input = `A\n\n\nFuente: X\n\n\nB`;
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).not.toMatch(/\n{3,}/);
    expect(r.cleaned).toContain('A');
    expect(r.cleaned).toContain('B');
  });

  it('texto sin nada citacional pasa 100% intacto', () => {
    const input = `Contenido normal sin nada raro.
- MaxHang 20mm, 4x7seg
- Frenchies a 90°
- Descanso 3 min entre series`;
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toBe(input);
    expect(r.stats.linesStripped).toBe(0);
    expect(r.stats.sectionsStripped).toBe(0);
    expect(r.stats.phrasesReplaced).toBe(0);
  });
});

describe('stripExplicitAttributions — combinación (chunk realista)', () => {
  it('chunk con Fuente + Referencias + "según X" → todo limpio', () => {
    const input = `Los flexores de dedos se adaptan con carga isométrica submáxima.
Según el estudio de López-Rivera 2021, el rango óptimo es 60-80% BW por 7-10 segundos.
Volumen: 4-6 series, descanso 2-3 min.
Fuente: Sport Sciences 2019

## Referencias
- López-Rivera 2021
- Eric Hörst — Training for Climbing`;
    const r = stripExplicitAttributions(input);
    expect(r.cleaned).toContain('flexores de dedos');
    expect(r.cleaned).toContain('rango óptimo es 60-80%');
    // Reemplazo preserva capitalización inicial de la frase: input "Según…"
    // → output "Según la evidencia" (mayúscula S).
    expect(r.cleaned).toContain('Según la evidencia');
    expect(r.cleaned).not.toContain('López-Rivera');
    expect(r.cleaned).not.toContain('Sport Sciences');
    expect(r.cleaned).not.toContain('Hörst — Training');
    expect(r.stats.linesStripped).toBe(1);
    expect(r.stats.sectionsStripped).toBe(1);
    expect(r.stats.phrasesReplaced).toBe(1);
  });
});
