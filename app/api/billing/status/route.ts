import { NextResponse } from 'next/server';
import { getSubscriptionAccess } from '@/lib/billing/subscription';

export const runtime = 'nodejs';

export async function GET() {
  const access = getSubscriptionAccess();

  return NextResponse.json({
    active: access.active,
    configured: access.configured,
    required: access.required
  });
}
