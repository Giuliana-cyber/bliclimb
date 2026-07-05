-- 0012 — Sanear catálogo con columna tipo_registro
--
-- Al implementar el gate de hangboard (Fase 3 sub-fase 2) descubrimos que
-- Sheet 01 mezcla ejercicios con notas/reglas/conceptos/tests en la misma
-- tabla. Esto ensucia cualquier filtro por familia Y crea un bug latente:
-- Bill/Senda podrían recomendar una nota "Faltante:..." como si fuera un
-- ejercicio.
--
-- Solución: columna tipo_registro con 5 valores derivados automáticamente
-- de Tipo + patrones de nombre en el CSV (lógica en
-- lib/exercises/csv-normalize.ts + scripts/_tmp add-tipo-registro.py).
--
-- Valores esperados (todos populados por el seeder, sin CHECK constraint
-- para respetar el diseño legacy-compat del resto de columnas):
--   ejercicio (314)  algo que la persona HACE
--   test      (83)   evaluación / medición
--   regla     (45)   instrucción para Bill (no ejercicio)
--   concepto  (22)   definición / mensaje / advertencia
--   nota      (19)   "Faltante:..." — recordatorio interno
--   TOTAL     483
--
-- Además: actualizar la vista exercises_eligible para incluir SOLO filas
-- con tipo_registro='ejercicio'. Elegibles baja de 369 → 294 (los 75 que
-- salen son notas/reglas/conceptos/tests que estaban erróneamente en el
-- pool y que Bill nunca debería recomendar como ejercicio).
--
-- Idempotente.

alter table public.exercises
  add column if not exists tipo_registro text;

-- Recrear la vista con el filtro adicional. `create or replace view` es
-- idempotente y no rompe permisos GRANT del paso 0010.
--
-- La vista sigue con security_invoker=on (hereda RLS de la tabla base).
-- El filtro de tipo_registro se agrega al filtro existente de publicable_app
-- (los 3 canónicos publicables). Ambos filtros son AND — un ejercicio debe
-- ser publicable Y ser realmente un ejercicio para entrar al pool.
create or replace view public.exercises_eligible
  with (security_invoker = on)
as
  select *
  from public.exercises
  where publicable_app in (
    'Sí',
    'Sí con bloqueo por perfil',
    'Sí con advertencia'
  )
  and tipo_registro = 'ejercicio';

-- Permisos: reafirmar el grant explícito (la recreación de la vista
-- preserva los grants existentes, pero lo dejamos por robustez).
grant select on public.exercises_eligible to authenticated;
