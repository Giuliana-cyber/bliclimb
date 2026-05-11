# Deploy en Vercel

## 1. Variables de entorno

Configura estas variables en Vercel para `Production` y `Preview`:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_VECTOR_STORE_ID=
REQUIRE_SUBSCRIPTION=true
NEXT_PUBLIC_APP_URL=https://TU-DOMINIO.vercel.app
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_SUBSCRIPTION_AMOUNT=1
MERCADO_PAGO_CURRENCY=USD
MERCADO_PAGO_USE_SANDBOX=false
SUBSCRIPTION_COOKIE_SECRET=
```

Si Mercado Pago no acepta USD en tu cuenta, usa MXN:

```env
MERCADO_PAGO_SUBSCRIPTION_AMOUNT=20
MERCADO_PAGO_CURRENCY=MXN
```

`SUBSCRIPTION_COOKIE_SECRET` debe ser una frase larga aleatoria. No uses la API key de OpenAI.

## 2. Deploy recomendado

La forma mas estable es conectar el repo a Vercel desde GitHub. Cada push a `main` dispara deploy.

Build command:

```bash
npm run build
```

Output directory:

```text
.next
```

## 3. Deploy por CLI

Si prefieres CLI:

```bash
npm i -g vercel
vercel link
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_MODEL production
vercel env add OPENAI_VECTOR_STORE_ID production
vercel env add REQUIRE_SUBSCRIPTION production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add MERCADO_PAGO_ACCESS_TOKEN production
vercel env add MERCADO_PAGO_SUBSCRIPTION_AMOUNT production
vercel env add MERCADO_PAGO_CURRENCY production
vercel env add MERCADO_PAGO_USE_SANDBOX production
vercel env add SUBSCRIPTION_COOKIE_SECRET production
vercel deploy --prod
```

Despues del primer deploy, actualiza `NEXT_PUBLIC_APP_URL` con el dominio real de Vercel y vuelve a desplegar.
