# BilClimb.ai

Bitacora inteligente de entrenamiento para escaladores. El MVP usa Next.js 14,
TypeScript, Tailwind CSS, OpenAI Responses API, File Search, localStorage y
Mercado Pago.

## Desarrollo local

```bash
npm install
npm run dev
```

La app corre por defecto en `http://localhost:3000`. En esta workspace solemos
usar `http://localhost:3003`.

## Scripts

```bash
npm run typecheck
npm run build
npm run lint
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores reales. No commitees
`.env.local`.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_VECTOR_STORE_ID=
REQUIRE_SUBSCRIPTION=false
NEXT_PUBLIC_APP_URL=http://localhost:3003
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_SUBSCRIPTION_AMOUNT=1
MERCADO_PAGO_CURRENCY=USD
MERCADO_PAGO_USE_SANDBOX=true
SUBSCRIPTION_COOKIE_SECRET=
```

## Producto

- Onboarding y perfil editable.
- Generacion de planes de entrenamiento.
- Dashboard orientado a la sesion de hoy.
- Vista semanal del plan.
- Modo sesion con timers y progreso persistente.
- Chat con Senda/Bill usando File Search.
- Check-ins, progreso y actividad manual.
- Suscripcion con Mercado Pago.
