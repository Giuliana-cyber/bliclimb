import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = [
  '/onboarding',
  '/generating-plan',
  '/plan',
  '/session',
  '/chat',
  '/progress',
  '/profile',
  '/checkin',
  '/settings',
  '/api/chat',
  '/api/generate-plan'
];

const AUTH_PAGES = ['/sign-in', '/sign-up'];

// Modo mantenimiento (2026-07-15 · Giuliana): con `MAINTENANCE_MODE=1` en
// Vercel envvars, todas las rutas salvo /maintenance y assets estáticos
// redirigen a /maintenance. Los endpoints /api/* responden 503. Se desactiva
// borrando la env var — el Edge middleware la relee en cada invocación.
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === '1';

// Rutas que siguen disponibles en mantenimiento.
const MAINTENANCE_ALLOWLIST = new Set([
  '/maintenance',
  '/api/health',
  // sign-in queda accesible por si Giuliana necesita entrar como admin.
  '/sign-in',
  '/api/auth/status'
]);

function isProtectedPath(pathname: string) {
  if (pathname === '/') {
    return true;
  }
  // Match estricto: solo `/prefix` o `/prefix/…`. Antes `startsWith`
  // capturaba también `/onboarding-v2` como si fuera `/onboarding`,
  // bloqueando el piloto Fase 4. Con match delimitado por `/`, la ruta
  // v2 queda pública (como /welcome, /hoy).
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
}

export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'development' && request.nextUrl.hostname === '127.0.0.1') {
    const url = request.nextUrl.clone();
    url.hostname = 'localhost';
    return NextResponse.redirect(url);
  }

  const { pathname } = request.nextUrl;

  // Cortocircuito mantenimiento — antes del fetch de sesión Supabase para
  // no cargar backend mientras la app está cerrada. Webhooks de Stripe/MP
  // se dejan pasar para no perder eventos entrantes.
  const isWebhook = pathname.startsWith('/api/webhooks/');
  if (MAINTENANCE_MODE && !MAINTENANCE_ALLOWLIST.has(pathname) && !isWebhook) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({
          error: 'service_unavailable',
          message: 'BilClimb está en mantenimiento. Volvemos pronto.'
        }),
        {
          status: 503,
          headers: { 'content-type': 'application/json', 'retry-after': '86400' }
        }
      );
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/maintenance';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  const { response, user } = await updateSession(request);

  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/sign-in';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)'
  ]
};
