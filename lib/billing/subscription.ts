import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const SUBSCRIPTION_COOKIE_NAME = 'bilclimb_subscription';

const MONTH_IN_SECONDS = 60 * 60 * 24 * 32;

export type SubscriptionCookiePayload = {
  sessionId: string;
  subscriptionId: string;
  customerId: string;
  createdAt: string;
  expiresAt: string;
};

export function isSubscriptionRequired() {
  return process.env.REQUIRE_SUBSCRIPTION === 'true';
}

export function isBillingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

function getCookieSecret() {
  return process.env.SUBSCRIPTION_COOKIE_SECRET ?? process.env.STRIPE_SECRET_KEY ?? '';
}

function sign(value: string) {
  return crypto.createHmac('sha256', getCookieSecret()).update(value).digest('base64url');
}

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  return firstBuffer.length === secondBuffer.length && crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

export function createSubscriptionCookieValue({
  sessionId,
  subscriptionId,
  customerId
}: {
  sessionId: string;
  subscriptionId: string;
  customerId: string;
}) {
  const now = new Date();
  const payload: SubscriptionCookiePayload = {
    sessionId,
    subscriptionId,
    customerId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + MONTH_IN_SECONDS * 1000).toISOString()
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function parseSubscriptionCookie(value: string | undefined) {
  if (!value || !getCookieSecret()) {
    return null;
  }

  const [encodedPayload, signature] = value.split('.');

  if (!encodedPayload || !signature || !safeEqual(sign(encodedPayload), signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SubscriptionCookiePayload;

    if (new Date(payload.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSubscriptionAccess() {
  const required = isSubscriptionRequired();
  const configured = isBillingConfigured();
  const subscription = parseSubscriptionCookie(cookies().get(SUBSCRIPTION_COOKIE_NAME)?.value);
  const active = required ? Boolean(subscription) : true;

  return {
    active,
    configured,
    required,
    subscription
  };
}

export function requireSubscriptionAccess() {
  const access = getSubscriptionAccess();

  if (access.active) {
    return null;
  }

  return NextResponse.json(
    {
      code: 'subscription_required',
      error: 'Necesitas una suscripción activa para usar las funciones con IA.'
    },
    { status: 402 }
  );
}

export const subscriptionCookieOptions = {
  httpOnly: true,
  maxAge: MONTH_IN_SECONDS,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production'
};
