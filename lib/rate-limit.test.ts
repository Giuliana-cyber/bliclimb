import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetMemoryRateLimit,
  checkRateLimitForIdentifier,
  commitRateLimitForIdentifier,
  isBypassed
} from './rate-limit';

// Mock supabase server client (no se llama directamente en los tests que
// usan ForIdentifier, pero la importación del módulo lo carga).
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) }
  })
}));

// Mock next/headers (idem).
vi.mock('next/headers', () => ({
  headers: () => ({
    get: () => null
  })
}));

const USER_ID = '11111111-2222-3333-4444-555555555555';
const userIdentifier = `user:${USER_ID}`;
const ipIdentifier = 'ip:1.2.3.4';

beforeEach(() => {
  __resetMemoryRateLimit();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isBypassed', () => {
  it('false sin env var', () => {
    expect(isBypassed(userIdentifier)).toBe(false);
  });

  it('false para identifier sin prefijo user:', () => {
    vi.stubEnv('RATE_LIMIT_BYPASS_USER_IDS', USER_ID);
    expect(isBypassed(ipIdentifier)).toBe(false);
  });

  it('true para user: cuyo uuid está en la lista', () => {
    vi.stubEnv('RATE_LIMIT_BYPASS_USER_IDS', USER_ID);
    expect(isBypassed(userIdentifier)).toBe(true);
  });

  it('soporta múltiples uuids coma-separados', () => {
    vi.stubEnv(
      'RATE_LIMIT_BYPASS_USER_IDS',
      `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa, ${USER_ID}, bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`
    );
    expect(isBypassed(userIdentifier)).toBe(true);
  });

  it('false si la env var tiene otros uuids pero no el del usuario', () => {
    vi.stubEnv('RATE_LIMIT_BYPASS_USER_IDS', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(isBypassed(userIdentifier)).toBe(false);
  });
});

describe('checkRateLimit + commitRateLimit (memory backend)', () => {
  it('check con bucket vacío devuelve ok=true', async () => {
    const result = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.remaining).toBe(2);
      expect(result.bypassed).toBe(false);
    }
  });

  it('check NO incrementa el bucket — múltiples checks devuelven el mismo remaining', async () => {
    const a = await checkRateLimitForIdentifier('plan', userIdentifier);
    const b = await checkRateLimitForIdentifier('plan', userIdentifier);
    const c = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (a.ok && b.ok && c.ok) {
      expect(a.remaining).toBe(2);
      expect(b.remaining).toBe(2);
      expect(c.remaining).toBe(2);
    }
  });

  it('commit incrementa el bucket', async () => {
    await commitRateLimitForIdentifier('plan', userIdentifier);
    const result = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.remaining).toBe(1);
    }
  });

  it('cuando se alcanza el límite, check devuelve ok=false + retryAfter', async () => {
    const now = 1_000_000;
    await commitRateLimitForIdentifier('plan', userIdentifier, now);
    await commitRateLimitForIdentifier('plan', userIdentifier, now + 10_000);
    const result = await checkRateLimitForIdentifier('plan', userIdentifier, now + 11_000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // El slot más viejo abre en now + 1h. now+11s → faltan ~3589s.
      expect(result.retryAfter).toBeGreaterThan(3580);
      expect(result.retryAfter).toBeLessThanOrEqual(3600);
      expect(result.userMessage).toMatch(/limitamos|Vuelve a intentar/);
    }
  });

  it('sliding window: tokens expiran después del window', async () => {
    const now = 1_000_000;
    await commitRateLimitForIdentifier('plan', userIdentifier, now);
    await commitRateLimitForIdentifier('plan', userIdentifier, now + 1_000);
    // En t=now+1500 está full
    const beforeWindow = await checkRateLimitForIdentifier(
      'plan',
      userIdentifier,
      now + 1500
    );
    expect(beforeWindow.ok).toBe(false);
    // Avanzamos 1h + 1s — ambos tokens caen del window
    const afterWindow = await checkRateLimitForIdentifier(
      'plan',
      userIdentifier,
      now + 3601_000
    );
    expect(afterWindow.ok).toBe(true);
    if (afterWindow.ok) expect(afterWindow.remaining).toBe(2);
  });

  it('plan: 2 tokens / 1 hora', async () => {
    const now = 1_000_000;
    await commitRateLimitForIdentifier('plan', userIdentifier, now);
    await commitRateLimitForIdentifier('plan', userIdentifier, now + 100);
    const third = await checkRateLimitForIdentifier('plan', userIdentifier, now + 200);
    expect(third.ok).toBe(false);
  });

  it('chat: 10 tokens / 1 minuto', async () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i += 1) {
      await commitRateLimitForIdentifier('chat', userIdentifier, now + i * 100);
    }
    const eleventh = await checkRateLimitForIdentifier(
      'chat',
      userIdentifier,
      now + 1000
    );
    expect(eleventh.ok).toBe(false);
    if (!eleventh.ok) {
      expect(eleventh.retryAfter).toBeLessThanOrEqual(60);
    }
  });

  it('buckets aislados entre identifiers (un usuario no afecta a otro)', async () => {
    await commitRateLimitForIdentifier('plan', userIdentifier);
    await commitRateLimitForIdentifier('plan', userIdentifier);
    const me = await checkRateLimitForIdentifier('plan', userIdentifier);
    const other = await checkRateLimitForIdentifier('plan', 'user:other-uuid');
    expect(me.ok).toBe(false);
    expect(other.ok).toBe(true);
  });

  it('buckets aislados entre kinds (chat no afecta plan)', async () => {
    for (let i = 0; i < 10; i += 1) {
      await commitRateLimitForIdentifier('chat', userIdentifier);
    }
    const chatFull = await checkRateLimitForIdentifier('chat', userIdentifier);
    const planFresh = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(chatFull.ok).toBe(false);
    expect(planFresh.ok).toBe(true);
  });
});

describe('bypass: usuario en RATE_LIMIT_BYPASS_USER_IDS', () => {
  beforeEach(() => {
    vi.stubEnv('RATE_LIMIT_BYPASS_USER_IDS', USER_ID);
  });

  it('check siempre devuelve ok=true con bypassed=true, incluso después de muchos commits', async () => {
    for (let i = 0; i < 100; i += 1) {
      await commitRateLimitForIdentifier('plan', userIdentifier);
    }
    const result = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bypassed).toBe(true);
      expect(result.remaining).toBe(Number.POSITIVE_INFINITY);
    }
  });

  it('commit es no-op para usuarios bypaseados (no incrementa el bucket)', async () => {
    await commitRateLimitForIdentifier('plan', userIdentifier);
    await commitRateLimitForIdentifier('plan', userIdentifier);
    await commitRateLimitForIdentifier('plan', userIdentifier);
    // Quitamos el bypass y chequeamos: si commit hubiera sido real, el
    // bucket estaría lleno. Como fue no-op, sigue vacío.
    vi.unstubAllEnvs();
    const result = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.remaining).toBe(2);
  });

  it('IPs nunca se bypasean, aunque el "uuid" aparezca en la env var', async () => {
    vi.stubEnv('RATE_LIMIT_BYPASS_USER_IDS', '1.2.3.4');
    await commitRateLimitForIdentifier('plan', ipIdentifier);
    await commitRateLimitForIdentifier('plan', ipIdentifier);
    const result = await checkRateLimitForIdentifier('plan', ipIdentifier);
    expect(result.ok).toBe(false);
  });
});

describe('escenarios end-to-end de la auditoría', () => {
  it('(a) éxito 200 → check ok + commit → token consumido', async () => {
    const checkBefore = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(checkBefore.ok).toBe(true);
    // Simulamos el flujo: validación pasó → check pasó → OpenAI exitoso → commit
    await commitRateLimitForIdentifier('plan', userIdentifier);
    const checkAfter = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(checkAfter.ok).toBe(true);
    if (checkAfter.ok) expect(checkAfter.remaining).toBe(1);
  });

  it('(b) fallo 5xx (OpenAI throw) → check ok pero NO commit → token NO consumido', async () => {
    const checkBefore = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(checkBefore.ok).toBe(true);
    // El endpoint pasa el check pero OpenAI tira → entra al catch global,
    // commit NUNCA se llama. Verificamos que el bucket sigue vacío.
    const checkAfter = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(checkAfter.ok).toBe(true);
    if (checkAfter.ok) expect(checkAfter.remaining).toBe(2);
  });

  it('(c) fallo 4xx por validación profile → check no se ejecuta → token NO consumido', async () => {
    // En el endpoint, el orden es:
    //   auth → safeParse → canRegeneratePlan → checkRateLimit → OpenAI → commitRateLimit
    // Si safeParse falla, el endpoint devuelve 400 ANTES de llamar a check.
    // Simulamos: nunca llamamos check ni commit.
    const result = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.remaining).toBe(2);
  });

  it('(d) fallo 4xx por límite mensual → check no se ejecuta → token NO consumido', async () => {
    // Mismo razonamiento que (c): canRegeneratePlan está antes de check.
    const result = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.remaining).toBe(2);
  });

  it('(e) bypass → check siempre permite, commit nunca incrementa', async () => {
    vi.stubEnv('RATE_LIMIT_BYPASS_USER_IDS', USER_ID);
    for (let i = 0; i < 50; i += 1) {
      const check = await checkRateLimitForIdentifier('plan', userIdentifier);
      expect(check.ok).toBe(true);
      await commitRateLimitForIdentifier('plan', userIdentifier);
    }
    vi.unstubAllEnvs();
    // Después de quitar bypass, bucket debería estar vacío.
    const result = await checkRateLimitForIdentifier('plan', userIdentifier);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.remaining).toBe(2);
  });

  it('(f) rate limit excedido → 429 con retryAfter correcto', async () => {
    const now = 1_000_000;
    await commitRateLimitForIdentifier('plan', userIdentifier, now);
    await commitRateLimitForIdentifier('plan', userIdentifier, now);
    const result = await checkRateLimitForIdentifier('plan', userIdentifier, now);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(3600);
      expect(result.userMessage).toMatch(/Vuelve a intentar/);
    }
  });
});
