// Rate limiter check-then-commit.
//
// API:
//   const decision = await checkRateLimit('plan');
//   if (!decision.ok) return 429;
//   ... do work that can fail ...
//   await commitRateLimit('plan');
//   return success;
//
// Contrato:
//   - `checkRateLimit` lee el estado del bucket; NO incrementa.
//   - `commitRateLimit` agrega una entrada al bucket. Llamar solo al final
//     del path de éxito.
//   - Si el endpoint falla server-side (5xx) o devuelve 4xx por validación
//     temprana, `commitRateLimit` simplemente no se llama y el token nunca
//     se descontó.
//
// Backends:
//   - Upstash (producción): sliding window REAL con sorted sets
//     (ZADD/ZCOUNT/ZREMRANGEBYSCORE). API pública, no internals.
//   - In-memory (dev / fallback): Map<key, number[]> con timestamps.
//
// Bypass:
//   - `RATE_LIMIT_BYPASS_USER_IDS` (env): UUIDs separados por coma. Solo
//     aplica a identifiers `user:<uuid>` (autenticados). IPs anónimas
//     nunca bypasean.

import { headers } from 'next/headers';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';

export type RateLimitKind = 'chat' | 'plan';

type Config = { maxTokens: number; windowMs: number };

const CONFIGS: Record<RateLimitKind, Config> = {
  chat: { maxTokens: 10, windowMs: 60 * 1000 },
  plan: { maxTokens: 2, windowMs: 60 * 60 * 1000 }
};

// ---------------- Upstash backend ----------------

let upstashClient: Redis | null = null;

function getUpstashClient(): Redis | null {
  if (upstashClient) return upstashClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  upstashClient = new Redis({ url, token });
  return upstashClient;
}

function bucketKey(kind: RateLimitKind, identifier: string): string {
  return `bilclimb:rl:${kind}:${identifier}`;
}

async function upstashCheck(
  kind: RateLimitKind,
  identifier: string
): Promise<{ count: number; oldestScore: number | null }> {
  const client = getUpstashClient();
  if (!client) throw new Error('upstash not configured');
  const key = bucketKey(kind, identifier);
  const now = Date.now();
  const cutoff = now - CONFIGS[kind].windowMs;
  // Limpiar entradas viejas (idempotente, no afecta el conteo).
  await client.zremrangebyscore(key, 0, cutoff);
  const count = (await client.zcard(key)) ?? 0;
  let oldestScore: number | null = null;
  if (count > 0) {
    const oldest = (await client.zrange(key, 0, 0, { withScores: true })) as
      | (string | number)[]
      | null;
    if (oldest && oldest.length >= 2) {
      const raw = oldest[1];
      oldestScore = typeof raw === 'number' ? raw : Number(raw);
    }
  }
  return { count, oldestScore };
}

async function upstashCommit(kind: RateLimitKind, identifier: string): Promise<void> {
  const client = getUpstashClient();
  if (!client) throw new Error('upstash not configured');
  const key = bucketKey(kind, identifier);
  const now = Date.now();
  // Member único para que dos commits en el mismo ms no colisionen.
  const member = `${now}-${Math.random().toString(36).slice(2)}`;
  await client.zadd(key, { score: now, member });
  // TTL un poco mayor que el window para que la key se limpie sola
  // si el usuario no vuelve.
  await client.expire(key, Math.ceil(CONFIGS[kind].windowMs / 1000) + 5);
}

// ---------------- In-memory backend ----------------

const memoryEntries = new Map<string, number[]>();

/**
 * Resetea el estado en memoria. Solo para tests; no se usa en runtime.
 */
export function __resetMemoryRateLimit(): void {
  memoryEntries.clear();
}

function memoryCheck(
  kind: RateLimitKind,
  identifier: string,
  now: number
): { count: number; oldestScore: number | null } {
  const key = bucketKey(kind, identifier);
  const cutoff = now - CONFIGS[kind].windowMs;
  const existing = memoryEntries.get(key) ?? [];
  // Limpiar timestamps viejos.
  const active = existing.filter((ts) => ts > cutoff);
  if (active.length !== existing.length) memoryEntries.set(key, active);
  return {
    count: active.length,
    oldestScore: active.length > 0 ? active[0] : null
  };
}

function memoryCommit(kind: RateLimitKind, identifier: string, now: number): void {
  const key = bucketKey(kind, identifier);
  const arr = memoryEntries.get(key) ?? [];
  arr.push(now);
  memoryEntries.set(key, arr);
}

// ---------------- Identifier (auth uid con fallback a IP) ----------------

async function getRateLimitIdentifier(): Promise<string> {
  try {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user?.id) return `user:${user.id}`;
  } catch {
    // ignore — caemos a IP
  }

  const headerStore = headers();
  const forwarded = headerStore.get('x-forwarded-for');
  const realIp = headerStore.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'anonymous';
  return `ip:${ip}`;
}

// ---------------- Bypass ----------------

/**
 * `true` si el identifier corresponde a un usuario autenticado en la lista
 * de bypass (env `RATE_LIMIT_BYPASS_USER_IDS`, coma-separados).
 *
 * Solo aceptamos prefix `user:` — IPs anónimas nunca pueden bypasear porque
 * sería un agujero abierto.
 */
export function isBypassed(identifier: string): boolean {
  if (!identifier.startsWith('user:')) return false;
  const raw = process.env.RATE_LIMIT_BYPASS_USER_IDS?.trim();
  if (!raw) return false;
  const userId = identifier.slice('user:'.length);
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(userId);
}

// ---------------- API pública ----------------

export type CheckResult =
  | { ok: true; remaining: number; identifier: string; bypassed: boolean }
  | {
      ok: false;
      remaining: 0;
      identifier: string;
      bypassed: false;
      retryAfter: number;
      userMessage: string;
    };

const MESSAGES: Record<RateLimitKind, (retryAfter: number) => string> = {
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

/**
 * Lee el estado del bucket sin incrementarlo. Si está lleno devuelve
 * `ok: false` con `retryAfter` (segundos hasta que se libere el slot más
 * viejo). Usuarios en `RATE_LIMIT_BYPASS_USER_IDS` siempre obtienen
 * `ok: true` con `bypassed: true`.
 *
 * `nowOverride` es para tests; no usar en runtime.
 */
export async function checkRateLimit(
  kind: RateLimitKind,
  nowOverride?: number
): Promise<CheckResult> {
  const identifier = await getRateLimitIdentifier();
  return checkRateLimitForIdentifier(kind, identifier, nowOverride);
}

/**
 * Variante de `checkRateLimit` que acepta un identifier explícito.
 * Exportada solo para tests; las route handlers usan `checkRateLimit()`.
 */
export async function checkRateLimitForIdentifier(
  kind: RateLimitKind,
  identifier: string,
  nowOverride?: number
): Promise<CheckResult> {
  if (isBypassed(identifier)) {
    // Log visible en Vercel para que la dueña del producto pueda
    // confirmar que la env var está activa sin tener que leer código.
    // Sale 1 línea por request del usuario bypaseado, formato fácil
    // de grepear en la búsqueda de Vercel logs.
    console.info('[rate-limit] bypassed', { kind, identifier });
    return {
      ok: true,
      remaining: Number.POSITIVE_INFINITY,
      identifier,
      bypassed: true
    };
  }
  const config = CONFIGS[kind];
  const now = nowOverride ?? Date.now();

  let state: { count: number; oldestScore: number | null };
  if (getUpstashClient()) {
    state = await upstashCheck(kind, identifier);
  } else {
    state = memoryCheck(kind, identifier, now);
  }

  if (state.count < config.maxTokens) {
    return {
      ok: true,
      remaining: config.maxTokens - state.count,
      identifier,
      bypassed: false
    };
  }

  const oldest = state.oldestScore ?? now;
  const retryAfter = Math.max(1, Math.ceil((oldest + config.windowMs - now) / 1000));
  return {
    ok: false,
    remaining: 0,
    identifier,
    bypassed: false,
    retryAfter,
    userMessage: MESSAGES[kind](retryAfter)
  };
}

/**
 * Incrementa el bucket. Llamar solo cuando el path de éxito está cerrado:
 * justo antes del `return NextResponse.json(...)` exitoso. Si el endpoint
 * falla server-side (catch global) o devuelve 4xx por validación, NO se
 * llama y el token nunca se descontó.
 *
 * Usuarios bypaseados son no-op.
 *
 * `nowOverride` es para tests; no usar en runtime.
 */
export async function commitRateLimit(
  kind: RateLimitKind,
  nowOverride?: number
): Promise<void> {
  const identifier = await getRateLimitIdentifier();
  await commitRateLimitForIdentifier(kind, identifier, nowOverride);
}

/**
 * Variante de `commitRateLimit` que acepta un identifier explícito.
 * Exportada para tests.
 */
export async function commitRateLimitForIdentifier(
  kind: RateLimitKind,
  identifier: string,
  nowOverride?: number
): Promise<void> {
  if (isBypassed(identifier)) return;
  const now = nowOverride ?? Date.now();
  if (getUpstashClient()) {
    await upstashCommit(kind, identifier);
  } else {
    memoryCommit(kind, identifier, now);
  }
}
