import { headers } from 'next/headers';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';

export type RateLimitKind = 'chat' | 'plan';

type Limiter = {
  limit: (id: string) => Promise<{ success: boolean; reset: number; remaining: number }>;
};

// ---------------- Backend Upstash (producción) ----------------

let upstashClient: Redis | null = null;
let limiters: Partial<Record<RateLimitKind, Ratelimit>> = {};

function getUpstashClient(): Redis | null {
  if (upstashClient) return upstashClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  upstashClient = new Redis({ url, token });
  return upstashClient;
}

function getUpstashLimiter(kind: RateLimitKind): Ratelimit | null {
  if (limiters[kind]) return limiters[kind]!;
  const client = getUpstashClient();
  if (!client) return null;
  const config =
    kind === 'chat'
      ? { tokens: 10, window: '1 m' as const }
      : { tokens: 2, window: '1 h' as const };
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(config.tokens, config.window),
    prefix: `bilclimb:rl:${kind}`,
    analytics: false
  });
  limiters[kind] = limiter;
  return limiter;
}

// ---------------- Backend in-memory (dev / Vercel single-region fallback) ----------------

type Bucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, Bucket>();
const MEMORY_WINDOWS: Record<RateLimitKind, { tokens: number; windowMs: number }> = {
  chat: { tokens: 10, windowMs: 60 * 1000 },
  plan: { tokens: 2, windowMs: 60 * 60 * 1000 }
};

function memoryLimit(kind: RateLimitKind, id: string) {
  const config = MEMORY_WINDOWS[kind];
  const key = `${kind}:${id}`;
  const now = Date.now();
  let bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + config.windowMs };
    memoryBuckets.set(key, bucket);
  }
  bucket.count += 1;
  const success = bucket.count <= config.tokens;
  return {
    success,
    reset: bucket.resetAt,
    remaining: Math.max(0, config.tokens - bucket.count)
  };
}

function getLimiter(kind: RateLimitKind): Limiter {
  const upstash = getUpstashLimiter(kind);
  if (upstash) {
    return {
      limit: async (id: string) => {
        const result = await upstash.limit(id);
        return {
          success: result.success,
          reset: result.reset,
          remaining: result.remaining
        };
      }
    };
  }
  return {
    limit: async (id: string) => memoryLimit(kind, id)
  };
}

// ---------------- Identificador (uid Supabase con fallback a IP) ----------------

async function getRateLimitIdentifier(): Promise<string> {
  // Preferimos auth.uid() — más estable que IP, y no se comparte entre browsers.
  try {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user?.id) return `user:${user.id}`;
  } catch {
    // Si falla supabase (env vars, lo que sea), seguimos al fallback de IP.
  }

  const headerStore = headers();
  // x-forwarded-for puede traer varias IPs encadenadas; nos quedamos la primera (cliente real).
  const forwarded = headerStore.get('x-forwarded-for');
  const realIp = headerStore.get('x-real-ip');
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    realIp ||
    'anonymous';
  return `ip:${ip}`;
}

// ---------------- API pública ----------------

export type RateLimitDecision =
  | { ok: true; remaining: number }
  | { ok: false; resetSeconds: number; userMessage: string };

const MESSAGES: Record<RateLimitKind, (resetSeconds: number) => string> = {
  chat: (s) =>
    `Estás escribiendo muy rápido. Espera ${humanizeSeconds(s)} antes de mandar otro mensaje.`,
  plan: (s) =>
    `Para evitar gastos altos en IA limitamos la generación de planes. Vuelve a intentar en ${humanizeSeconds(s)}.`
};

function humanizeSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} segundos`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hora${hours === 1 ? '' : 's'}`;
}

export async function enforceRateLimit(kind: RateLimitKind): Promise<RateLimitDecision> {
  const identifier = await getRateLimitIdentifier();
  const limiter = getLimiter(kind);
  const result = await limiter.limit(identifier);

  if (result.success) {
    return { ok: true, remaining: result.remaining };
  }

  const resetSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return {
    ok: false,
    resetSeconds,
    userMessage: MESSAGES[kind](resetSeconds)
  };
}
