# Stripe — pasos manuales

Pasos que ya hicimos en el dashboard de Stripe para que el flujo de
suscripción funcione. Este doc existe para reproducirlos en otra cuenta
(staging, fork, etc.) sin tener que adivinar.

## 1. Crear el Product

Dashboard → Products → **+ Add product**

- Name: `BilClimb.ai Pro`
- Description: corta, sale en el checkout.
- Image: opcional.

## 2. Crear el Price

Dentro del Product → **+ Add another price**

- Pricing model: **Recurring**
- Price: **249 MXN**
- Billing period: **Yearly**
- Free trial: **30 days** (esto setea `trial_period_days: 30` en el Price;
  Checkout lo aplica automáticamente sin pasarlo en código).
- Save.
- Copiá el **Price ID** (formato `price_1TjA6I…`). Va a `STRIPE_PRICE_ID`
  en Vercel + `.env.local`.

> Si más adelante cambiás precio, **creá un Price nuevo**, no edites el
> existente. Stripe no permite mutar el monto de un Price activo. El
> código lee `STRIPE_PRICE_ID` de env var, así que es un rollout sin
> deploy.

## 3. API keys

Dashboard → Developers → **API keys**

- **Publishable key** → `STRIPE_PUBLISHABLE_KEY` (Vercel + `.env.local`).
- **Secret key** → `STRIPE_SECRET_KEY` (Vercel + `.env.local`). NUNCA al
  cliente — esta key cobra dinero.

## 4. Webhook endpoint

Dashboard → Developers → **Webhooks → + Add endpoint**

- Endpoint URL:
  - Production: `https://<tu-dominio>/api/webhooks/stripe`
  - Preview: agregar uno separado por cada dominio si querés probar previews
- Events to send (las 5 que el handler procesa):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Save.
- Click en el endpoint → **Signing secret** → reveal → copiá.
- Esto va a `STRIPE_WEBHOOK_SECRET` (Vercel + `.env.local`).

> Si no configurás esto, todas las notificaciones se rechazan con 401.
> El handler ya no acepta requests sin firma válida.

## 5. Aplicar la migración a Supabase

La migración `supabase/migrations/0004_stripe_fields.sql` agrega
`stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id` y los
índices. Idempotente.

- Supabase Dashboard → SQL Editor → pegar el contenido y Run.
- O `supabase db push` con la CLI.

Verificar:

```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'entitlements'
  and column_name like 'stripe%';
```

Debería listar las 3 columnas.

## 6. Test en modo Test (sandbox)

Stripe separa claramente Test vs Live. Toggle arriba a la izquierda.

- En **Test mode**: usá keys que empiezan con `sk_test_…` y `pk_test_…`.
- Tarjeta de prueba: `4242 4242 4242 4242`, CVC cualquier 3 dígitos, fecha
  cualquier futura.
- Webhook secret de Test es distinto al de Live (el dashboard te muestra
  el de cada modo).

Flujo end-to-end:

1. `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` en modo Test.
2. En BilClimb → `/subscribe` → email → "Empezar 30 días gratis".
3. Te lleva al Checkout de Stripe. Pagás con la tarjeta de prueba.
4. Redirige a `/billing/success`.
5. Stripe Dashboard → Developers → Events: deberías ver
   `checkout.session.completed` y `customer.subscription.created` con
   status `succeeded`.
6. Supabase:
   ```sql
   select profile_id, status, current_period_end, stripe_customer_id, stripe_subscription_id
   from entitlements where profile_id = '<tu-user-id>';
   ```
   Status debe ser `'active'` (trialing colapsado), period_end ~30 días
   futuro.

## 7. Probar cancelación

1. Como user logueado → `/settings` → "Cancelar suscripción".
2. Confirmar el modal.
3. El endpoint llama `subscriptions.update(id, { cancel_at_period_end: true })`.
4. Webhook `customer.subscription.updated` actualiza el row → status pasa a
   `'cancelled'`, `current_period_end` se mantiene.
5. UI muestra "Cancelada (acceso hasta DD/MM)".

## 8. Probar renovación (Test)

Después del trial Stripe intenta cobrar. En Test puede simular cobros
exitosos / fallidos:

- Forzar fallo: en el customer → suscripción → Action menu → "Test a
  payment failure".
- Eso dispara `invoice.payment_failed` → `markStripePastDue` → row pasa a
  `'past_due'`.
- Volver a intentar pago exitoso → `invoice.payment_succeeded` →
  `updateStripePeriodEnd` → row vuelve a `'active'` con nuevo period_end.

## 9. Pasar a producción

- Cambiar keys a Live (`sk_live_…`, `pk_live_…`).
- Crear el webhook endpoint en Live mode (es otro dashboard, otro
  secret).
- Setear `STRIPE_WEBHOOK_SECRET` con el secret de Live.
- Confirmar que `STRIPE_PRICE_ID` apunta al Price de Live (los products
  no se comparten entre Test y Live — hay que recrear el Product / Price).

## Resumen de env vars

| Variable | Dónde | Notas |
|---|---|---|
| `STRIPE_SECRET_KEY` | Vercel (prod + preview), `.env.local` | sk_live / sk_test |
| `STRIPE_PUBLISHABLE_KEY` | Vercel + `.env.local` | pk_live / pk_test |
| `STRIPE_WEBHOOK_SECRET` | Vercel + `.env.local` | whsec_… del endpoint específico |
| `STRIPE_PRICE_ID` | Vercel + `.env.local` | price_… del plan anual |
