# Mercado Pago wind-down · Instrucciones para Giuliana

**Fecha**: 2026-07-15 · **Aprobado por Giuliana** · **Fail-closed por diseño**

## Contexto

Bill baja de producción para arrancar el rediseño BilClimb v-next. Hay
usuarios reales pagando via preapprovals de Mercado Pago que quedaron
activos en los servidores de MP aunque el código local ya no gestione MP
(post-nuke `Launch B3`). Este script cancela esos preapprovals y exporta
los pagos para reembolsos.

## Cero riesgo antes de que corras el script

1. **App ya está en modo mantenimiento** (commit `bf6666b`). Cuando actives
   `MAINTENANCE_MODE=1` en Vercel, cualquier signup nuevo por Stripe queda
   bloqueado con 503.
2. **Los preapprovals MP viejos siguen renovando** hasta que corramos este
   script. Prioridad: bajar app + cancelar en el mismo día.

## Requiere: token de MP producción

El `MERCADO_PAGO_ACCESS_TOKEN` local está vacío en `.env.local` (se
limpió cuando se nukeó MP del código). El token real está en dos lugares:

- **Vercel** → Project `bliclimb` → Settings → Environment Variables →
  copiar valor de `MERCADO_PAGO_ACCESS_TOKEN` (production).
- **Mercado Pago Dashboard** → Tus integraciones / Credenciales de
  producción → "Access Token".

## Pasos (correr localmente desde el repo)

```bash
# 1. Exportar el token (NO commitearlo, NO pegarlo en chat)
export MP_ACCESS_TOKEN="APP_USR-..."   # el valor de Vercel/MP dashboard

# 2. Listar activos (solo lectura, sin cambios)
python3 scripts/ops/mp_wind_down.py list
# → escribe docs/ops/mp_wind_down/preapprovals_active.json
# → imprime tabla: preapproval_id · email · monto · currency · reason

# 3. (Opcional) Simular cancelación
python3 scripts/ops/mp_wind_down.py cancel --dry-run
# → muestra qué se cancelaría, sin tocar nada

# 4. Ejecutar cancelaciones
python3 scripts/ops/mp_wind_down.py cancel --live
# → pide confirmación textual: hay que escribir CANCELAR
# → escribe docs/ops/mp_wind_down/cancellation_log.jsonl (append-only)
# → verifica al final que 0 preapprovals quedan en 'authorized'

# 5. Exportar CSV de pagos para reembolsos
python3 scripts/ops/mp_wind_down.py export-payments
# → escribe docs/ops/mp_wind_down/payments_for_refund.csv
# → resumen por usuario con total cobrado
```

## Verificación end-to-end

Después del `cancel --live`:

- El script imprime `Verificación: 0 preapprovals todavía en 'authorized'`.
- El log `cancellation_log.jsonl` tiene una línea `result=ok` por cada
  cancelación (o `result=error` con detalle si alguna falló).
- Si alguna falló → volver a correr `cancel --live`, es idempotente
  (los ya-cancelled se saltean naturalmente).

## Salida del CSV (para tu proceso de reembolsos)

`payments_for_refund.csv` tiene una fila por pago cobrado:

| Columna | Descripción |
|---|---|
| `email` | Email del payer en MP |
| `amount` | Monto cobrado |
| `currency` | `MXN` / `ARS` / etc. |
| `date` | Fecha de aprobación del pago |
| `payment_id` | ID del pago en MP (usar para el refund) |
| `preapproval_id` | ID de la suscripción que originó el pago |
| `payment_status` | `approved`, `refunded`, `cancelled`, etc. |
| `refunded` | `yes` si ya está reembolsado, `no` si pendiente |

Ventana de reembolso MP: **180 días** desde la fecha del pago. Los que
salen `refunded=no` y `date > hace-180-días` son los que necesitan tu
acción manual (dashboard MP → Movimientos → Devolver) o coordinamos correr
por API en lote.

## Regla operativa

- **NO borrar datos** — usuarios, perfiles y pagos quedan en Supabase.
  Son la cohorte del relanzamiento.
- **NO reembolsos automáticos desde este script** — vos hacés los refunds
  para preservar el registro contable. Si preferís batch por API, decime
  y agrego el subcomando `refund-batch`.
- **Sí cancelaciones de preapprovals** — es la única forma de detener
  el sangrado; sin esto los cobros siguen aunque la app esté cerrada.

## Auditoría

Todo el proceso queda registrado en `docs/ops/mp_wind_down/`:

- `preapprovals_active.json` — snapshot pre-cancelación
- `cancellation_log.jsonl` — log append-only con timestamp por cancelación
- `payments_for_refund.csv` — export para reembolsos

Estos archivos se commiten al repo salvo que contengan datos personales
sensibles (emails de usuarios) — en ese caso, agregarlos a `.gitignore`
antes de correr el script.

## Si el script falla

- `HTTP 401 unauthorized` → token vencido o incorrecto. Refrescar desde MP dashboard.
- `HTTP 400 preapproval_status_invalid` → el preapproval ya está en otro
  estado (cancelled, paused). Idempotente: se saltea.
- `Network error` → reintento manual. Los cancelados quedaron ok.

Contacto: cualquier duda, avisá antes de re-correr `cancel --live`.
