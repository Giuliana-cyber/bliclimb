// Paso 5 · Pool loader.
//
// Dos adapters de `PoolLoader`:
//   1. `supabasePoolLoader` — SELECT contra public.exercises. Producción.
//   2. `inMemoryPoolLoader` — recibe array literal. Para tests / mocks.
//
// El pool se carga UNA VEZ por request (no una vez por llamada al matcher)
// porque un plan típico dispara 100-250 llamadas al resolver y hacer 250
// round-trips a Supabase sería catastrófico. La responsabilidad del cache
// per-request queda del lado del caller — el loader es pure I/O.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogRow, PoolLoader } from './types';

/**
 * Adapter Supabase. Un solo SELECT que trae todo el pool relevante
 * (~265 rows post-0026). El WHERE `tipo_registro='ejercicio' AND
 * categoria_canonica IS NOT NULL` alinea con el índice
 * `idx_exercises_matcher_pool` (0028) para query eficiente.
 *
 * Costo real esperado: <30ms para 265 rows con el índice compuesto GIN
 * detrás de los tags. Testear en performance test post-migración.
 */
export function supabasePoolLoader(supabase: SupabaseClient): PoolLoader {
  return {
    async loadPool() {
      const { data, error } = await supabase
        .from('exercises')
        .select(
          [
            'id',
            'nombre',
            'descripcion',
            'nivel_canonico',
            'categoria_canonica',
            'proposito',
            'momento',
            'equipo_canonico',
            'stimulus_derivado',
            'tags',
            'intensidad',
            'riesgo',
            'series',
            'reps',
            'tiempo',
            'descanso',
            'cues',
            'errores_comunes',
            'precauciones',
            'senales_detener',
            'equipo'
          ].join(', ')
        )
        .eq('tipo_registro', 'ejercicio')
        .not('categoria_canonica', 'is', null);
      if (error) {
        throw new Error(
          `pool-loader.supabase: ${error.message} (code=${error.code ?? 'unknown'})`
        );
      }
      return (data ?? []) as unknown as CatalogRow[];
    }
  };
}

/**
 * Adapter in-memory. Los tests construyen fixtures del pool y lo pasan
 * directo — el matcher no toca red.
 *
 * También útil como cache en runtime: cargar una vez con supabasePoolLoader,
 * envolver el array con `inMemoryPoolLoader(rows)`, y pasarlo al matcher
 * para las N llamadas de la sesión.
 */
export function inMemoryPoolLoader(rows: CatalogRow[]): PoolLoader {
  return {
    async loadPool() {
      return rows;
    }
  };
}
