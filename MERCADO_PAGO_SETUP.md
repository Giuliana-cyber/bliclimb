# Mercado Pago — pasos manuales

Estos son los pasos que **tenés que hacer tú** en el panel de Mercado Pago para que el webhook funcione en producción. Todo lo demás (rutas, verificación de firma, persistencia, idempotencia) ya está en código.

## 1. Crear / abrir la aplicación en Mercado Pago

1. Entrá a https://www.mercadopago.com.mx/developers/panel/app (o el panel correspondiente a tu país).
2. Si no tenés una aplicación creada, **Crear aplicación** → completá nombre (ej. `BilClimb.ai`), modelo de integración: **CheckoutPro o Suscripciones**.
3. Si ya existe la app, abrila.

## 2. Sacar el Access Token

1. Dentro de la app → **Credenciales de producción** (o **de prueba** si todavía estás en sandbox).
2. Copiá el **Access Token**.
3. Configuralo como `MERCADO_PAGO_ACCESS_TOKEN` en:
   - tu `.env.local` para dev
   - **Vercel → Settings → Environment Variables** para preview y production

> ⚠️ Si estás en sandbox, también poné `MERCADO_PAGO_USE_SANDBOX=true`. En producción ponelo en `false`.

## 3. Configurar el Webhook URL

1. En el panel de la aplicación → **Webhooks** → **Configurar notificaciones**.
2. URL: `https://<tu-dominio>/api/webhooks/mercadopago`
   - Producción: ej. `https://bilclimb.vercel.app/api/webhooks/mercadopago`
   - Preview: cada preview de Vercel tiene su propio dominio. Para testear cambios podés agregar un segundo webhook con el dominio de preview, o usar la opción **"Notificar a una URL adicional"**.
3. Marcá los eventos que vas a recibir. **Mínimo necesario**:
   - `payment` (todos los subtipos: `payment.created`, `payment.updated`).
   - `subscription_preapproval` (autorización inicial, pausa, cancelación).
4. Guardá. Mercado Pago va a hacer un ping de prueba — debería responder **200**.

## 4. Sacar el secret del webhook

Una vez configurado el webhook, en la misma pantalla aparece un campo **Secret** o **Clave secreta**.

1. Copialo.
2. Configuralo como `MERCADO_PAGO_WEBHOOK_SECRET` en tu `.env.local` y en Vercel (production y preview).

> Sin este secret, **todas las notificaciones se rechazan con 401**. Es la única defensa que tenés contra que cualquiera te POSTée a la URL del webhook para falsear pagos.

## 5. Setear `SUBSCRIPTION_COOKIE_SECRET`

Aunque hoy el estado de pago vive en DB, todavía dejamos las cookies HMAC como fallback de lectura por una semana. El código del cookie ahora exige un secret ≥ 32 chars.

Generalo y configuralo:

```bash
openssl rand -hex 32
```

→ valor a poner como `SUBSCRIPTION_COOKIE_SECRET` en `.env.local` y en Vercel.

## 6. Configurar `REQUIRE_SUBSCRIPTION`

- En **dev** (`.env.local`): `REQUIRE_SUBSCRIPTION=false` para no chocar con el gate mientras probás.
- En **production / preview** de Vercel: `REQUIRE_SUBSCRIPTION=true` para que el gate funcione.

## 7. Aplicar la migración a Supabase

Esta sesión añadió `supabase/migrations/0002_entitlements.sql`. Es idempotente — la podés correr varias veces sin perder datos.

- **Supabase Dashboard → SQL Editor** → pegar el contenido del archivo y ejecutar.
- O con CLI: `supabase db push` (si tenés `supabase` CLI conectado al proyecto).

Verificar:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'entitlements'
order by ordinal_position;
```

Debería listar `profile_id`, `free_plan_used_at`, `provider`, `provider_subscription_id`, `status`, `current_period_end`, etc.

Y la tabla de idempotencia:

```sql
select * from public.webhook_events limit 1;
```

(vacía, pero la query no debería fallar).

## 8. Test end-to-end (en sandbox primero)

1. Asegurate que `MERCADO_PAGO_USE_SANDBOX=true`.
2. En el panel de MP → **Cuentas de prueba** → crear un comprador de prueba (te da email + clave).
3. En BilClimb (sandbox) → suscribirte usando el email del comprador de prueba.
4. Te redirige al checkout sandbox de MP, pagás con la tarjeta de prueba (números en su doc).
5. Después del pago, mirá en Supabase:

   ```sql
   select profile_id, status, current_period_end, provider_subscription_id, free_plan_used_at
   from public.entitlements
   where profile_id = '<tu-user-id>';
   ```

   Debería ya tener `status='active'` y `current_period_end` en el futuro.

6. Mirá los logs de Vercel (Functions → `/api/webhooks/mercadopago`) — deberías ver entradas JSON con `event_type`, `action_taken: entitlement_updated`, `request_id`.

7. Para validar idempotencia: en el panel de MP → ver el detalle de la notificación → **Reenviar**. El segundo intento debería loguear `event: duplicate` y no cambiar el row.

## 9. Probar cancelación

1. Como comprador de prueba → desde MP, ir a **Mis suscripciones** → cancelar.
2. Esperar el webhook (el panel también permite forzar el reenvío).
3. Verificar: `status` debería pasar a `cancelled`, pero `current_period_end` se mantiene; el usuario sigue con acceso hasta esa fecha.

## 10. Cuando pasés a producción

- Cambiar `MERCADO_PAGO_USE_SANDBOX=false`.
- Reemplazar `MERCADO_PAGO_ACCESS_TOKEN` por el token de producción.
- Reemplazar `MERCADO_PAGO_WEBHOOK_SECRET` por el secret de la app de producción (si MP separa apps por sandbox/prod, son secrets distintos).
- Reverificar que la URL del webhook en MP apunta al dominio de producción, no al de preview.

---

## Resumen de env vars

| Variable | Dónde | Notas |
|---|---|---|
| `MERCADO_PAGO_ACCESS_TOKEN` | Vercel (prod + preview), `.env.local` | App de MP → Credenciales |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Vercel (prod + preview), `.env.local` | Webhook → Secret |
| `MERCADO_PAGO_USE_SANDBOX` | Vercel | `true` en preview, `false` en prod |
| `MERCADO_PAGO_SUBSCRIPTION_AMOUNT` | Vercel | `1` |
| `MERCADO_PAGO_CURRENCY` | Vercel | `USD` (o tu moneda) |
| `SUBSCRIPTION_COOKIE_SECRET` | Vercel + `.env.local` | `openssl rand -hex 32`, ≥ 32 chars |
| `REQUIRE_SUBSCRIPTION` | `false` en dev, `true` en prod/preview | |
