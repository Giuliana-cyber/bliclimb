import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';

const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

const isProtectedRoute = createRouteMatcher([
  '/',
  '/onboarding(.*)',
  '/generating-plan(.*)',
  '/plan(.*)',
  '/session(.*)',
  '/chat(.*)',
  '/progress(.*)',
  '/profile(.*)',
  '/checkin(.*)',
  '/api/chat(.*)',
  '/api/generate-plan(.*)'
]);

const clerkAuthMiddleware = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export function middleware(request: NextRequest, event: NextFetchEvent) {
  if (process.env.NODE_ENV === 'development' && request.nextUrl.hostname === '127.0.0.1') {
    const url = request.nextUrl.clone();
    url.hostname = 'localhost';
    return NextResponse.redirect(url);
  }

  if (clerkEnabled) {
    return clerkAuthMiddleware(request, event);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)'
  ]
};
