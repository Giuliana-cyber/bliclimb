import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const SUBSCRIPTION_COOKIE_NAME = 'bilclimb_subscription';
export const FREE_PLAN_COOKIE_NAME = 'bilclimb_free_plan_used';

const MONTH_IN_SECONDS = 60 * 60 * 24 * 32;
const FIVE_YEARS_SECONDS = 60 * 60 * 24 * 365 * 5;

export type SubscriptionCookiePayload = {
  subscriptionId: string;
  payerEmail: string;
  createdAt: string;
  expiresAt: string;
};

export function isSubscriptionRequired() {
  return process.env.REQUIRE_SUBSCRIPTION === 'true';
}

export function isBillingConfigured() {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
}

function getCookieSecret(): string {
  const secret = process.env.SUBSCRIPTION_COOKIE_SECRET ?? '';
  // Bloqueamos HMAC con secret vacío — un fallback silencioso aquí permite
  // que cualquiera forje cookies de suscripción.
  if (secret.length < 32) {
    throw new Error(
      'SUBSCRIPTION_COOKIE_SECRET no está configurado o es demasiado corto (< 32 chars). ' +
        'Generá uno con `openssl rand -hex 32` y agregalo a tu entorno antes de aceptar pagos.'
    );
  }
  return secret;
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
  subscriptionId,
  payerEmail
}: {
  subscriptionId: string;
  payerEmail: string;
}) {
  const now = new Date();
  const payload: SubscriptionCookiePayload = {
    subscriptionId,
    payerEmail,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + MONTH_IN_SECONDS * 1000).toISOString()
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function parseSubscriptionCookie(value: string | undefined) {
  if (!value) {
    return null;
  }

  let expectedSignature: string;
  try {
    const [encodedPayload, signature] = value.split('.');
    if (!encodedPayload || !signature) return null;
    expectedSignature = sign(encodedPayload);
    if (!safeEqual(expectedSignature, signature)) return null;
  } catch {
    // Secret no configurado o cualquier otro fallo → tratamos como cookie inválida.
    return null;
  }

  const [encodedPayload] = value.split('.');
  if (!encodedPayload) return null;

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

/**
 * Gate específico para la generación de plan:
 * - Si REQUIRE_SUBSCRIPTION=false (dev) → permitido ilimitado.
 * - Si tiene suscripción activa → permitido siempre.
 * - Si no usó plan gratis todavía → permitido (1ª vez gratis).
 * - Si ya usó plan gratis y no tiene suscripción → 402.
 *
 * Después de generar exitosamente, llama markFreePlanUsed() para setear la cookie.
 */
export function requirePlanGenerationAccess() {
  if (!isSubscriptionRequired()) {
    return null;
  }

  const cookieStore = cookies();
  const hasFreePlanUsed = cookieStore.get(FREE_PLAN_COOKIE_NAME)?.value === '1';
  const subscription = parseSubscriptionCookie(cookieStore.get(SUBSCRIPTION_COOKIE_NAME)?.value);
  const hasActiveSubscription = Boolean(subscription);

  if (hasActiveSubscription) {
    return null;
  }

  if (!hasFreePlanUsed) {
    return null;
  }

  return NextResponse.json(
    {
      code: 'subscription_required',
      error:
        'Ya usaste tu plan gratis. Suscríbete por $1/mes para regenerar y seguir entrenando con IA.'
    },
    { status: 402 }
  );
}

export function markFreePlanUsed() {
  cookies().set(FREE_PLAN_COOKIE_NAME, '1', {
    httpOnly: true,
    maxAge: FIVE_YEARS_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
}

export const subscriptionCookieOptions = {
  httpOnly: true,
  maxAge: MONTH_IN_SECONDS,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production'
};
