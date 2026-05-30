import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const hasPublishableKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const hasSecretKey = Boolean(process.env.CLERK_SECRET_KEY);

  return NextResponse.json({
    clerkConfigured: hasPublishableKey && hasSecretKey,
    hasPublishableKey,
    hasSecretKey,
    signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? '/sign-in',
    signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? '/sign-up'
  });
}
