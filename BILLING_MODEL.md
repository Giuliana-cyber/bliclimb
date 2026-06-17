# BilClimb.ai · Modelo de billing

> Última actualización: Junio 2026 — migración a Stripe.

## Resumen

- **Plan inicial gratuito**: 1 plan + chat ilimitado durante **30 días** después de
  generarlo (gate viejo `free_plan_used_at`). Sin tarjeta.
- **Suscripción**: anual de **$249 MXN/año** vía Stripe Checkout con **30 días de
  trial** gestionados por Stripe. Después de los 30 días Stripe cobra
  automáticamente.
- **Sin recurrencia mensual.** Una vez al año.
- **Mercado Pago** queda como código legacy hasta validar Stripe en producción.

## Reglas exactas

| Estado del usuario | Puede generar plan | Puede usar chat | Notas |
|---|---|---|---|
| Nunca generó plan, sin trial activo | ✅ (1er plan gratis) | ❌ | `plan_required` hasta que genere |
| Plan generado hace ≤ 30 días, sin Stripe | ❌ | ✅ | Mes gratis del modelo viejo |
| Plan generado > 30 días, sin Stripe | ❌ `payment_required` | ❌ `payment_required` | Hay que suscribirse |
| Stripe `trialing` o `active` con período vigente | ✅ ilimitado | ✅ ilimitado | Cubre el trial de 30 días + período pagado |
| Stripe `cancelled` con `current_period_end > now` | ✅ ilimitado | ✅ ilimitado | Acceso hasta el final del año pagado |
| Stripe `cancelled` con período vencido | ❌ | ❌ | Igual que sin suscripción |
| Stripe `past_due` o `paused` | ❌ | ❌ | Renovación falló o pausada |

## Cómo se enforce en código

### Tabla `entitlements` (Supabase)

Una fila por usuario (`UNIQUE (profile_id)`). Campos relevantes después de
`0004_stripe_fields.sql`:

- `free_plan_used_at: timestamptz | null` — se setea cuando `/api/generate-plan`
  genera + valida un plan con éxito.
- `provider: 'stripe' | 'mercado_pago' | null` — el activo es `'stripe'`.
- `status: 'active' | 'paused' | 'cancelled' | 'past_due' | 'pending' | null` — escrito por el webhook.
- `current_period_end: timestamptz | null` — fecha de fin del período actual
  (trial o anual).
- `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id` — set por
  checkout + webhook.

> Las columnas `provider_subscription_id`, `payer_email`, `amount_cents`,
> `currency` quedan de MP por compatibilidad histórica pero las escrituras
> nuevas no las usan.

Migraciones:
- [`0002_entitlements.sql`](supabase/migrations/0002_entitlements.sql) — tabla base.
- [`0003_cleanup_legacy_constraints.sql`](supabase/migrations/0003_cleanup_legacy_constraints.sql) — drops legacy.
- [`0004_stripe_fields.sql`](supabase/migrations/0004_stripe_fields.sql) — columnas Stripe.

### Helpers (`lib/entitlements.ts`)

| Helper | Devuelve |
|---|---|
| `getEntitlement(userId)` | Fila completa, la crea vacía si no existe. |
| `canGenerateFreePlan(userId)` | `true` si `free_plan_used_at === null`. |
| `hasActiveSubscription(userId)` | `true` si `status ∈ {active, cancelled}` Y `current_period_end > now`. Cubre Stripe trialing (mapeado a `active`). |
| `freePlanExpiresAt(entitlement)` | Fecha del `free_plan_used_at + 30 días`. |
| `isWithinFreePlanWindow(userId)` | `true` si esa fecha sigue en el futuro. |
| `hasActivePlanAccess(userId)` | Suscripción activa O dentro del mes gratis. |
| `markFreePlanUsed(userId)` | Idempotente, post-éxito de generación. |
| `mapStripeStatus(status)` | Stripe → enum interno. `trialing` y `active` ambos → `'active'`. |
| `upsertStripeCustomer(userId, customerId)` | Set `provider='stripe'` + customer id. |
| `upsertFromStripeSubscription(userId, sub)` | Escribe status/period_end/sub_id/price_id desde un evento de Stripe. |
| `markStripeSubscriptionCancelled(subId)` | Status `cancelled` preservando period_end. |
| `updateStripePeriodEnd(subId, unix)` | Bump del período tras `invoice.payment_succeeded`. |
| `markStripePastDue(subId)` | Tras `invoice.payment_failed`. |
| `findEntitlementByStripeCustomerId(id)` | Lookup para webhook sin metadata. |

### Gates (`lib/billing/gates.ts`)

#### `/api/generate-plan`

```
hasActiveSubscription(userId) || canGenerateFreePlan(userId)
```

- `true` → genera; tras validación de seguridad llama `markFreePlanConsumed`.
- `false` → 402 `payment_required`.

#### `/api/chat`

```
hasActivePlanAccess(userId)
```

- `true` → chat habilitado.
- `false` + nunca generó plan → 402 `plan_required`.
- `false` + mes gratis vencido → 402 `payment_required`.

### Endpoints de billing

| Ruta | Qué hace |
|---|---|
| `POST /api/billing/create-checkout-session` | Resuelve / crea el `stripe_customer_id`, crea la Checkout Session de suscripción y devuelve `{ checkoutUrl }`. |
| `POST /api/billing/cancel-subscription` | Llama `stripe.subscriptions.update(id, { cancel_at_period_end: true })` server-side. El webhook confirma. |
| `POST /api/webhooks/stripe` | Verifica firma con `constructEvent`, idempotencia con `webhook_events`, procesa 5 tipos de evento. |

### Suscripción inicial

1. Usuario → `/subscribe` → ingresa email → POST a `/api/billing/create-checkout-session`.
2. Endpoint crea (o reusa) Stripe Customer; crea Checkout Session con
   `mode: subscription`, `subscription_data.metadata.supabase_user_id = userId`.
3. Redirige a Stripe Checkout. Pago con tarjeta.
4. Stripe redirige a `/billing/success` con `session_id`. La UI muestra
   "Suscripción activada".
5. Stripe dispara `checkout.session.completed` + `customer.subscription.created`
   al webhook. El webhook resuelve userId desde `metadata.supabase_user_id` y
   hace `upsertFromStripeSubscription` → status `active` (trialing colapsado),
   period_end = fin del trial.

### Cancelación

1. `/settings` → "Cancelar suscripción" → modal → "Sí, cancelar".
2. POST a `/api/billing/cancel-subscription`. El endpoint llama
   `stripe.subscriptions.update(id, { cancel_at_period_end: true })`.
3. Optimistamente: `markStripeSubscriptionCancelled` → status `cancelled`,
   period_end intacto.
4. Stripe dispara `customer.subscription.updated` → webhook confirma.
5. Al llegar `current_period_end`, Stripe ejecuta el cancel real y dispara
   `customer.subscription.deleted` → preservamos el estado `cancelled`.

### Trial de 30 días

- Configurado en el **Price** de Stripe (`trial_period_days: 30`). Checkout
  lo aplica automáticamente.
- Durante el trial: Stripe expone status `trialing`. Nuestro mapper lo
  colapsa a `'active'` en el DB → `hasActiveSubscription` retorna true.
- `current_period_end` durante el trial = fecha de fin del trial.
- Al terminar el trial Stripe intenta cobrar la primera factura. Si tiene
  éxito → `customer.subscription.updated` con `status: 'active'` + nuevo
  period_end un año adelante. Si falla → `invoice.payment_failed` →
  `'past_due'`.

## Knobs

- **Precio**: `STRIPE_PRICE_ID` env var. Para cambiar precio creá un Price
  nuevo en el dashboard y cambiá el env var. Sin deploy.
- **Duración del trial**: cambiá `trial_period_days` del Price en el
  dashboard de Stripe. Sin deploy.
- **Duración del mes gratis (no-Stripe)**: `FREE_PLAN_WINDOW_MS` en
  `lib/entitlements.ts`. Cambiar este sí necesita deploy.

## Casos límite

- **Plan falla por safety + reintento también falla**: el `free_plan_used_at` no
  se marca → no se consume el plan gratis.
- **Webhook duplicado**: `webhook_events.request_id` es PK; `{ deduped: true }`.
- **Usuario suscribe, cancela, vuelve a suscribirse**: nuevo checkout abre el
  mismo Customer (lookup por `stripe_customer_id`). Stripe crea una nueva
  Subscription; el webhook hace upsert sobre la misma fila de entitlements →
  el `stripe_subscription_id` se reemplaza.
- **`metadata.supabase_user_id` ausente** (raro): webhook cae a lookup por
  `stripe_customer_id` y, si tampoco está, retrieve del Customer de Stripe y
  lee su metadata. Si nada funciona → `ignored_missing_user_id` (logueado).

## Mercado Pago legacy

Marcado con `// TODO(legacy-mp): remove after Stripe validated` en:

- `lib/billing/mercado-pago.ts`
- `app/api/billing/create-subscription/route.ts` (re-export)
- `app/api/webhooks/mercadopago/route.ts`
- `lib/billing/subscription.ts` (cookie HMAC)

Cuando Stripe lleve 1-2 meses estable en prod, se borra todo. Por ahora
queda por si hay que volver de emergencia.
