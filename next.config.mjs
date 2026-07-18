// Headers de seguridad para producción.
//
// CSP allowlist:
// - 'self' (mismo origen)
// - Supabase: REST + Realtime
// - Stripe: Checkout, JS SDK, hooks
// - OpenAI: api.openai.com (server-side, pero connect-src lo cubre por si
//   en el futuro hacemos llamadas desde el cliente)
//
// Notas:
// - 'unsafe-inline' en script-src: Next.js inyecta scripts inline para
//   hydration (Server Components → Client Components). Sin esto la app
//   no monta. Si en el futuro habilitamos nonces lo quitamos.
// - 'unsafe-eval' es necesario en dev (HMR) y para Framer Motion en algunos
//   navegadores. Lo dejamos restringido al cliente.
// - frame-src para Stripe Checkout/Elements.
// - worker-src 'self' blob: para el service worker de la PWA.
// - manifest-src 'self' para /manifest.json.

const SUPABASE_HOST = 'https://*.supabase.co';
const SUPABASE_WS = 'wss://*.supabase.co';

const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Next 14 + Tailwind necesita unsafe-inline para hidratación e injection
  // de estilos. Stripe.js para Checkout JS.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `connect-src 'self' ${SUPABASE_HOST} ${SUPABASE_WS} https://api.stripe.com https://checkout.stripe.com https://api.openai.com`,
  `frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self' https://checkout.stripe.com`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: CSP_DIRECTIVES
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Aplica a todo excepto /api/webhooks/* (webhooks de Stripe no van
        // a frames y no queremos arriesgar interferencia con la verificación
        // de firma).
        source: '/((?!api/webhooks).*)',
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
