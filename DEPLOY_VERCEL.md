# Deploy en Vercel

Checklist para publicar BilClimb.ai sin exponer secretos y con OpenAI, File Search y Mercado Pago funcionando.

## 1. Antes de subir

Corre localmente:

```bash
npm run typecheck
npm run build
```

Confirma que `.env.local` no este commiteado. Solo `.env.example` debe vivir en Git.

## 2. Conectar GitHub

1. En GitHub Desktop, pulsa `Push origin` para subir `main`.
2. En Vercel, elige `Add New Project`.
3. Importa `Giuliana-cyber/bliclimb`.
4. Framework: `Next.js`.
5. Build command: `npm run build`.
6. Output directory: `.next`.

Cada push a `main` hara un deploy nuevo.

## 3. Variables de entorno

Configura estas variables en Vercel para `Production` y `Preview`:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_VECTOR_STORE_ID=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
REQUIRE_SUBSCRIPTION=true
NEXT_PUBLIC_APP_URL=https://TU-DOMINIO.vercel.app
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_SUBSCRIPTION_AMOUNT=1
MERCADO_PAGO_CURRENCY=USD
MERCADO_PAGO_USE_SANDBOX=true
SUBSCRIPTION_COOKIE_SECRET=
```

Notas:

- `OPENAI_VECTOR_STORE_ID` debe ser el vector store con la base de conocimiento de escalada.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` activan el login real. Puedes crearlas desde Clerk o instalar Clerk desde Vercel Marketplace.
- `SUBSCRIPTION_COOKIE_SECRET` debe ser una frase larga aleatoria. No uses llaves de OpenAI ni Mercado Pago.
- Para pruebas, deja `MERCADO_PAGO_USE_SANDBOX=true` y usa credenciales sandbox de Mercado Pago.
- Para produccion, cambia `MERCADO_PAGO_USE_SANDBOX=false` y usa credenciales reales.
- Si Mercado Pago no acepta USD en tu cuenta, usa MXN:

```env
MERCADO_PAGO_SUBSCRIPTION_AMOUNT=20
MERCADO_PAGO_CURRENCY=MXN
```

Despues del primer deploy, actualiza `NEXT_PUBLIC_APP_URL` con el dominio real y redeploya.

## 4. Mercado Pago sandbox

1. En Mercado Pago Developers, crea o usa una aplicacion.
2. Copia el access token de prueba en `MERCADO_PAGO_ACCESS_TOKEN`.
3. Mantén `MERCADO_PAGO_USE_SANDBOX=true`.
4. En la app desplegada, abre `/subscribe`.
5. Inicia la suscripcion con un email de prueba.
6. Al volver a `/billing/success`, verifica que la app cree la cookie de suscripcion.

## 5. Login con Clerk

1. Crea una aplicacion en Clerk o instala Clerk desde Vercel Marketplace.
2. Copia `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` en Vercel.
3. Agrega tambien:

```env
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

4. Haz redeploy.
5. Abre la app en una ventana normal y confirma que te manda a `/sign-in`.
6. Crea una cuenta y vuelve a BilClimb.
7. Cierra y abre el navegador: la sesion debe seguir activa.

Importante: este login ya identifica usuarios de forma real. La sincronizacion completa de plan/progreso entre dispositivos requiere una base de datos, porque el MVP todavia guarda esos datos en `localStorage`.

## 6. Pruebas de OpenAI

Prueba esto con `REQUIRE_SUBSCRIPTION=false` primero para aislar errores:

1. Completa onboarding.
2. Abre `/generating-plan` y genera un plan.
3. Verifica que el plan este en espanol, respete equipo disponible y tenga ejercicios detallados.
4. Abre `/chat` y pregunta algo de tecnica.
5. Confirma que no aparece error de `OPENAI_VECTOR_STORE_ID`.

Luego activa `REQUIRE_SUBSCRIPTION=true` y confirma que chat/generate-plan pidan suscripcion si no hay acceso.

## 7. Pruebas funcionales

Haz este flujo completo:

1. Inicio: revisar `Hoy toca`, riesgo estimado y CTA `Empezar sesion`.
2. Plan: abrir una semana, usar `Ver detalles`, confirmar que no hay timers interactivos.
3. Sesion: marcar ejercicios, salir, volver y confirmar que el progreso se conserva.
4. Timer: ejecutar un ejercicio con timer.
5. Guia: abrir `Guia` y luego `Preguntar a Senda`.
6. Check-in: finalizar sesion, registrar RPE, dolor, energia, sueno y notas.
7. Actividad manual: abrir `/checkin?manual=1` y guardar algo fuera del plan.
8. Progreso: confirmar sesiones, adherencia, RPE, dolor, energia, sueno y actividades manuales.
9. Perfil: cambiar objetivo/equipo/lesion/nivel/dias y confirmar aviso para regenerar plan.
10. Suscripcion: probar `/subscribe`, `/billing/success` y `/api/billing/status`.

## 8. Deploy por CLI opcional

Si prefieres CLI:

```bash
npm i -g vercel
vercel link
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_MODEL production
vercel env add OPENAI_VECTOR_STORE_ID production
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production
vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_URL production
vercel env add NEXT_PUBLIC_CLERK_SIGN_UP_URL production
vercel env add REQUIRE_SUBSCRIPTION production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add MERCADO_PAGO_ACCESS_TOKEN production
vercel env add MERCADO_PAGO_SUBSCRIPTION_AMOUNT production
vercel env add MERCADO_PAGO_CURRENCY production
vercel env add MERCADO_PAGO_USE_SANDBOX production
vercel env add SUBSCRIPTION_COOKIE_SECRET production
vercel deploy --prod
```
