-- 0010 — Catálogo de ejercicios (Sheet 01 v3, 483 filas)
--
-- Tabla `exercises` que persiste el CSV curado por el equipo de contenido.
-- El motor de generación de plan (Fase 3) filtra desde acá por perfil del
-- usuario antes de pasarlo al LLM.
--
-- Diseño de tipos (consenso Fase 1):
--   - Casi todo `text` — el CSV mezcla valores canónicos ("Alta"),
--     variantes de puntuación ("Bajo-Medio" vs "Bajo/Medio"), y
--     descriptivos largos ("Alta si se usa regleta pequeña o carga alta").
--     Un enum estricto rechazaría el 40% de las filas por ruido de
--     curación. Se canonicalizará en un PR posterior (ver
--     docs/brain/canonicalization-debt.md).
--   - `tags` como `text[]` para queries por elemento con GIN index.
--   - `publicable_app` es un multi-valor de gating, NO un bool. Preserva:
--       'Sí'                            → visible libre en la app
--       'Sí con bloqueo por perfil'     → aplica reglas Sec 1 del Doc 02
--       'Sí con advertencia'            → mostrar con disclaimer
--       'Sólo educativo / motor'        → consultable por RAG, NO asignable
--       'No publicar todavía'           → borrador, el motor no lo ve
--
-- Idempotente.

create table if not exists public.exercises (
  id                        text primary key,
  nombre                    text not null,
  tipo                      text not null,
  categoria                 text not null,
  subcategoria              text,
  objetivo                  text,
  nivel                     text,
  tipo_escalador            text,
  equipo                    text not null,
  descripcion               text not null,
  series                    text,
  reps                      text,
  tiempo                    text,
  tut                       text,
  descanso                  text,
  intensidad                text,
  frecuencia                text,
  progresion                text,
  regresion                 text,
  errores_comunes           text,
  precauciones              text,
  senales_detener           text,
  riesgo                    text not null,
  tags                      text[] not null default '{}',
  fuente_primaria           text not null,
  fuente_secundaria         text,
  url_fuente                text,
  estado                    text not null,
  publicable_app            text not null,
  validacion_profesional    text,
  notas                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Índices para los filtros más comunes del motor + admin panel.
-- Convención: idx_{tabla}_{col}[_método].
create index if not exists idx_exercises_tags_gin
  on public.exercises using gin (tags);

create index if not exists idx_exercises_categoria
  on public.exercises (categoria);

create index if not exists idx_exercises_nivel
  on public.exercises (nivel);

create index if not exists idx_exercises_riesgo
  on public.exercises (riesgo);

create index if not exists idx_exercises_publicable_app
  on public.exercises (publicable_app);

-- Trigger updated_at (reusa public.touch_updated_at() de 0001_init).
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'exercises_touch'
      and tgrelid = 'public.exercises'::regclass
  ) then
    create trigger exercises_touch before update on public.exercises
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;

-- RLS: catálogo de sistema.
--   - SELECT: cualquier authenticated (lectura libre del catálogo).
--   - INSERT/UPDATE/DELETE: sin política → solo service_role (que bypasea
--     RLS por diseño de Supabase). El seeder corre con service_role_key.
alter table public.exercises enable row level security;

drop policy if exists exercises_select_authenticated on public.exercises;
create policy exercises_select_authenticated on public.exercises
  for select
  to authenticated
  using (true);

-- Vista `exercises_eligible`: subset del catálogo que el motor puede
-- asignar en un plan. Excluye:
--   - 'Sólo educativo / motor' y variantes (RAG-only, NO asignables)
--   - 'No publicar todavía' (borradores)
--
-- Las variantes 'Sí con bloqueo por perfil' y 'Sí con advertencia' SÍ se
-- incluyen; la capa de gating de Fase 3 (plan-safety.ts extendido) filtra
-- por perfil antes de pasarlas al LLM.
--
-- security_invoker=on garantiza que la vista respeta la RLS de la tabla
-- (el caller ve los mismos rows que vería con SELECT directo).
create or replace view public.exercises_eligible
  with (security_invoker = on)
as
  select *
  from public.exercises
  where publicable_app in (
    'Sí',
    'Sí con bloqueo por perfil',
    'Sí con advertencia'
  );

-- Permisos: la vista hereda RLS pero requiere GRANT explícito por defecto.
grant select on public.exercises_eligible to authenticated;
