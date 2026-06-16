# BilClimb.ai · Modelo de billing

> Última actualización: Junio 2026

## Resumen

- **Plan gratuito**: 1 plan completo + chat ilimitado durante **30 días** desde la generación.
- **Suscripción**: cuando el usuario quiere generar un **segundo plan**, o cuando se acaba el mes gratis, se pide suscripción de **$1/mes** (configurable; en producción puede subir a $20 MXN/mes).
- **Cancelación**: en cualquier momento, desde `/settings`. El acceso se mantiene hasta el final del período pagado.

## Reglas exactas

| Estado del usuario | Puede generar plan | Puede usar chat | Notas |
|---|---|---|---|
| Nunca generó plan, sin suscripción | ✅ (1er plan) | ❌ (necesita plan primero) | `plan_required` |
| Plan generado hace ≤ 30 días, sin suscripción | ❌ (es su 2°) | ✅ | Mes gratis activo |
| Plan generado hace > 30 días, sin suscripción | ❌ | ❌ `payment_required` | Mes terminó |
| Cualquier momento, con `status='active'` | ✅ ilimitado | ✅ ilimitado | Suscripción pagada |
| `status='cancelled'` + `current_period_end > now` | ✅ ilimitado | ✅ ilimitado | Período pagado en curso |
| `status='cancelled'` + período vencido | ❌ | ❌ | Igual que sin suscripción |
| `status='paused'` o `'past_due'` | ❌ | ❌ | Mercado Pago rechazó cobro |

## Cómo se enforce en código

### Source of truth: tabla `entitlements`

Una fila por usuario (`UNIQUE (profile_id)`). Campos relevantes:

- `free_plan_used_at: timestamptz | null` — se setea **después** de que `/api/generate-plan` genera Y valida un plan exitosamente.
- `status: 'active' | 'paused' | 'cancelled' | 'past_due' | 'pending' | null` — escrito por el webhook de MP.
- `current_period_end: timestamptz | null` — fecha en la que termina el período pagado.
- `provider_subscription_id: text | null` — el `preapproval_id` de MP, usado para el binding del webhook.

Migración: [`supabase/migrations/0002_entitlements.sql`](supabase/migrations/0002_entitlements.sql) (idempotente).

### Helpers (`lib/entitlements.ts`)

| Helper | Devuelve |
|---|---|
| `getEntitlement(userId)` | Fila completa. La crea vacía si no existe. |
| `canGenerateFreePlan(userId)` | `true` si `free_plan_used_at === null`. |
| `hasActiveSubscription(userId)` | `true` si `status ∈ {active, cancelled}` Y `current_period_end > now`. |
| `freePlanExpiresAt(entitlement)` | `Date` (`free_plan_used_at + 30 días`) o `null`. |
| `isWithinFreePlanWindow(userId)` | `true` si `freePlanExpiresAt > now`. |
| `hasActivePlanAccess(userId)` | `true` si tiene suscripción activa O está dentro del mes gratis. |
| `markFreePlanUsed(userId)` | Idempotente. Setea `free_plan_used_at = now()` solo si era null. |
| `upsertEntitlementFromWebhook(...)` | Escribe el resultado de un evento de MP. |

### Gates (`lib/billing/gates.ts`)

#### `/api/generate-plan`

```
hasActiveSubscription(userId) || canGenerateFreePlan(userId)
```

- `true` → genera el plan; tras validación de seguridad llama `markFreePlanConsumed(userId)`.
- `false` → 402 `payment_required` "Ya usaste tu plan gratis…".

#### `/api/chat`

```
hasActivePlanAccess(userId)
```

- `true` → permite el chat.
- `false` + nunca generó plan → 402 `plan_required`.
- `false` + ya consumió mes gratis → 402 `payment_required`.

### Cookie HMAC (legacy, `lib/billing/subscription.ts`)

Quedó intacta pero **no se consulta más** desde los gates críticos. Sigue viva mientras `BillingSuccess.tsx` la usa para hacer polling en `/billing/success`. Se borra en una próxima sesión cuando esa pantalla se reescriba para leer `entitlements` directamente.

## Cómo se cancela

1. Usuario abre `/settings` → click en **Cancelar suscripción** (solo visible si `status === 'active'`).
2. Modal de confirmación con la fecha hasta la que mantiene acceso.
3. Click "Sí, cancelar" → POST a `/api/billing/cancel-subscription`.
4. El endpoint:
   - Verifica autenticación con Supabase.
   - Lee `entitlement.provider_subscription_id`.
   - Llama `cancelSubscriptionPreapproval(id)` → `PUT https://api.mercadopago.com/preapproval/{id}` con `{ status: 'cancelled' }`. **Server-side** — el access token nunca sale del servidor.
   - Marca optimistamente `entitlement.status = 'cancelled'` (preservando `current_period_end`).
5. Mercado Pago dispara webhook `subscription_preapproval.updated` con `status: 'cancelled'` → [`/api/webhooks/mercadopago/route.ts`](app/api/webhooks/mercadopago/route.ts) confirma la transición y persiste el estado.

## Flujo de suscripción inicial

1. Usuario quiere generar segundo plan o vio que el mes gratis termina pronto → abre `/subscribe`.
2. [`SubscribeCard`](components/billing/SubscribeCard.tsx) → POST a `/api/billing/create-checkout-session` con el email.
3. El endpoint:
   - Verifica autenticación.
   - Pre-crea fila `entitlements` si no existía.
   - Llama `createSubscriptionPreapproval({ email, userId, requestUrl })` → MP retorna `init_point` (URL de checkout) y `id` (preapproval_id).
   - Pre-binding: upsert `entitlements` con `provider='mercado_pago'`, `provider_subscription_id=id`, `status='pending'`.
4. Usuario redirigido a checkout de MP. Paga con tarjeta.
5. MP redirige a `/billing/success` y dispara webhook `payment.created` / `payment.updated` con `status: 'approved'`.
6. Webhook resuelve `external_reference = user.id` → upsert `status='active'`, `current_period_end = next_payment_date` (o now + frequency).
7. UI de `/settings` muestra "Activa" en el próximo refresh.

## Banner UI

[`components/billing/FreePlanWindowBanner.tsx`](components/billing/FreePlanWindowBanner.tsx) se renderiza en el Dashboard y en `/plan` cuando:
- `freePlanExpiresAt !== null`, Y
- `hasActiveSubscription === false`, Y
- `freePlanExpiresAt > now`.

Muestra la fecha de fin y, si quedan ≤ 7 días, un CTA "Suscribirme ahora" → `/subscribe`.

Datos vienen de `GET /api/auth/status` (que ya devuelve `billing.{status, hasActiveSubscription, freePlanUsedAt, freePlanExpiresAt, inFreePlanWindow}`).

## Casos límite

- **Generar plan que falla validación de safety**: el reintento corre antes de marcar `free_plan_used_at`. Si el reintento también falla, la fila se queda con `free_plan_used_at = null` → no se consume el plan gratis.
- **Suscripción activa + intento de generar plan**: pasa el gate por `hasActiveSubscription`. `markFreePlanConsumed` ya considera el caso y no marca `free_plan_used_at` si el usuario tiene suscripción activa.
- **Reanudación tras cancelar**: el usuario puede volver a `/subscribe` y crear una nueva preapproval. El webhook hace upsert en la misma fila (clave única por `profile_id`) → `status` pasa de `cancelled` a `pending` → `active`.
- **Webhook duplicado**: `webhook_events.request_id` es PK; el segundo POST devuelve `{ deduped: true }` sin tocar nada.

## Cómo cambiar el precio o la duración del mes gratis

- Precio: `MERCADO_PAGO_SUBSCRIPTION_AMOUNT` en Vercel.
- Moneda: `MERCADO_PAGO_CURRENCY`.
- Duración del mes gratis: `FREE_PLAN_WINDOW_MS` en `lib/entitlements.ts` (constante exportada). Cambiala junto con los textos en `FreePlanWindowBanner` y los gates si el copy menciona "30 días".
