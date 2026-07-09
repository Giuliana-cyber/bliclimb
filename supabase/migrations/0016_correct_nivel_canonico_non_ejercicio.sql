-- ============================================================================
-- 0016 · Corrección post-0015: NULL nivel_canonico en no-ejercicio + limpiar tag menor
--
-- Contexto: 0015 se aplicó a Supabase el 2026-07-09 con distribución final
-- 59/22/90/49/120/142 = 482 rows. El UPDATE del CASE y los UPDATE de tags
-- no tenían guard por `tipo_registro`, así que aplicaron también a los 169
-- rows non-ejercicio (test, regla, concepto, nota). El resultado:
--
--   - 169 rows non-ejercicio con `nivel_canonico` mal asignado (reglas
--     tagueadas como 'principiante', etc.).
--   - 5 rows con tag `menor` que son todas non-ejercicio: DP-R005, DP-S002,
--     EV-RH-003, HB-F006, HB-S006 (aprobación explícita de Giuliana turno
--     2026-07-09 después de correr las guardias).
--
-- Esta migración corrige el estado ya aplicado. El archivo 0015 se corrigió
-- post-hoc con guards `AND tipo_registro = 'ejercicio'` para futuros
-- environments (correr desde cero mapea solo ejercicios).
--
-- Los 169 non-ejercicio se auditan en Paso 4 del workstream para decidir
-- DELETE / migrate / retain por tipo. Ver deuda #8 en canonicalization-debt.md
-- para el breakdown ~64 ruido puro + ~105 con algún valor.
--
-- Idempotente: si nivel_canonico ya es NULL o el tag ya no está, no toca.
-- ============================================================================

-- ---- 1. NULL nivel_canonico en non-ejercicio ----
--
-- Los 169 rows con tipo_registro IN ('nota', 'regla', 'concepto', 'test')
-- reciben nivel_canonico = NULL. La CHECK constraint de 0015 permite NULL
-- (nivel_canonico IS NULL OR nivel_canonico IN (6 buckets)).
update public.exercises
set nivel_canonico = null
where tipo_registro != 'ejercicio'
  and nivel_canonico is not null;

-- ---- 2. Limpiar tag `menor` de non-ejercicio ----
--
-- Los 5 rows tagueados con 'menor' en 0015 son todos non-ejercicio
-- (DP-R005 regla, DP-S002 regla, EV-RH-003 test, HB-F006 nota, HB-S006 regla).
-- El tag se retira. En un environment nuevo (0015 corregida), el tag
-- solo se aplicaría a ejercicios reales — y ninguno de los 5 rows con
-- nivel referente a menores es ejercicio, así que en la práctica ningún
-- row tendría el tag hasta que se agregue un ejercicio real con esa
-- característica de nivel.
update public.exercises
set tags = array_remove(tags, 'menor')
where tipo_registro != 'ejercicio'
  and 'menor' = any(tags);

-- ---- 3. Notas de invariantes que esta migración NO toca ----
--
-- - HB-REHAB-A2A4 (tipo_registro='ejercicio', nivel='Rehab', tag='rehab'):
--   ejercicio real de rehab, no se toca. Conserva nivel_canonico='todos'
--   y tag 'rehab' aplicados por 0015.
-- - Los 314 ejercicios reales: conservan su nivel_canonico intacto.
-- - Los índices y CHECK constraint de 0015: siguen aplicando.
-- - FIL-004: ya borrado por 0015, no aparece.
