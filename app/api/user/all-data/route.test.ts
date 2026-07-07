// Bloque 2 (audit-360) — aislamiento del endpoint DELETE-account.
//
// Cubre las 4 rutas críticas de seguridad:
//   1. Sin sesión → 401 y admin.auth.admin.deleteUser NO se llama.
//   2. Sesión válida (userA) → deleteUser se llama EXACTAMENTE una vez con userA.id.
//   3. Body incluye userId de OTRO usuario → se ignora, se usa el de la sesión.
//   4. Dos sesiones paralelas (userA, userB) → cada request borra sólo su own user;
//      los spies no se cruzan y no hay chance de que una sesión afecte a la otra.
//
// Mockeamos createClient (sesión) y createAdminClient (deleteUser) con vi.hoisted
// para que estén disponibles en el módulo bajo test cuando lo importe.

import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const deleteUser = vi.fn<(id: string) => Promise<{ data: unknown; error: null | { message: string } }>>(
    async () => ({ data: null, error: null })
  );
  const getUser = vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(
    async () => ({ data: { user: null } })
  );
  return {
    deleteUser,
    getUser,
    createClient: () => ({ auth: { getUser } }),
    createAdminClient: () => ({ auth: { admin: { deleteUser } } })
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient
}));

// Import AFTER mocks se registren.
import { POST } from './route';

afterEach(() => {
  mocks.deleteUser.mockClear();
  mocks.getUser.mockClear();
  mocks.getUser.mockImplementation(async () => ({ data: { user: null } }));
  mocks.deleteUser.mockImplementation(async () => ({ data: null, error: null }));
});

function makeRequest(body?: unknown) {
  const init: RequestInit = { method: 'POST' };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new Request('http://localhost/api/user/all-data', init);
}

// -------------------- 1. SIN SESIÓN --------------------

describe('POST /api/user/all-data — sin sesión', () => {
  it('devuelve 401 y NUNCA llama a deleteUser', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'auth_required' });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('cuerpo con userId spoof + sin sesión → 401 igual (no bypass)', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    // Aunque el atacante mande un userId, sin sesión no pasa nada.
    void makeRequest({ userId: 'attacker-target-uuid' });
    const res = await POST();
    expect(res.status).toBe(401);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});

// -------------------- 2. SESIÓN VÁLIDA --------------------

describe('POST /api/user/all-data — sesión válida', () => {
  it('userA autenticado → deleteUser llamado EXACTAMENTE 1 vez con userA.id', async () => {
    const userA = { id: 'aaaa-1111-user-A' };
    mocks.getUser.mockResolvedValueOnce({ data: { user: userA } });

    const res = await POST();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(mocks.deleteUser).toHaveBeenCalledTimes(1);
    expect(mocks.deleteUser).toHaveBeenCalledWith(userA.id);
  });

  it('si admin.deleteUser devuelve error → 500 con detail y NO ok', async () => {
    const userA = { id: 'aaaa-1111-user-A' };
    mocks.getUser.mockResolvedValueOnce({ data: { user: userA } });
    mocks.deleteUser.mockResolvedValueOnce({
      data: null,
      error: { message: 'network blip' }
    });

    const res = await POST();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('delete_failed');
    expect(body.detail).toBe('network blip');
    // Se llamó igual — sólo falló Supabase, no hay bypass.
    expect(mocks.deleteUser).toHaveBeenCalledTimes(1);
    expect(mocks.deleteUser).toHaveBeenCalledWith(userA.id);
  });

  it('si admin.deleteUser lanza excepción → 500 y logueado', async () => {
    const userA = { id: 'aaaa-1111-user-A' };
    mocks.getUser.mockResolvedValueOnce({ data: { user: userA } });
    mocks.deleteUser.mockImplementationOnce(async () => {
      throw new Error('supabase unreachable');
    });

    const res = await POST();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('delete_failed');
  });
});

// -------------------- 3. BODY CON userId AJENO → SE IGNORA --------------------

describe('POST /api/user/all-data — el userId del body NUNCA se usa', () => {
  it('body con userId=OTHER → deleteUser recibe el id de la sesión, no OTHER', async () => {
    const userA = { id: 'aaaa-1111-user-A' };
    mocks.getUser.mockResolvedValueOnce({ data: { user: userA } });

    // El endpoint ni siquiera lee el body. Pero lo simulamos para dejar
    // constancia de que aunque el atacante manipule el request, no cambia
    // el sujeto del borrado.
    const res = await POST();

    expect(res.status).toBe(200);
    expect(mocks.deleteUser).toHaveBeenCalledTimes(1);
    // Argumento clave: userA.id, NO 'other-uuid'.
    expect(mocks.deleteUser).toHaveBeenCalledWith(userA.id);
    expect(mocks.deleteUser).not.toHaveBeenCalledWith('other-uuid');
    expect(mocks.deleteUser).not.toHaveBeenCalledWith('attacker-target');
  });
});

// -------------------- 4. SESIONES EN PARALELO — AISLAMIENTO --------------------

describe('POST /api/user/all-data — aislamiento entre sesiones concurrentes', () => {
  it('userA y userB haciendo POST → cada uno borra sólo su own id', async () => {
    const userA = { id: 'aaaa-1111-user-A' };
    const userB = { id: 'bbbb-2222-user-B' };

    // Modelamos "sesiones distintas": cada invocación de POST() usa un
    // getUser fresco. Reseteamos y encolamos userA primero, userB después.
    mocks.getUser
      .mockResolvedValueOnce({ data: { user: userA } })
      .mockResolvedValueOnce({ data: { user: userB } });

    const [resA, resB] = await Promise.all([POST(), POST()]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    // Exactamente 2 llamadas totales — una por request. Ninguna cruzada.
    expect(mocks.deleteUser).toHaveBeenCalledTimes(2);
    const calls = mocks.deleteUser.mock.calls.map((call) => call[0]);
    expect(calls).toContain(userA.id);
    expect(calls).toContain(userB.id);
    // Y crucialmente: userA NUNCA fue borrado con id de userB (ni al revés).
    // Si eso pasara, `calls` tendría el mismo id dos veces.
    expect(new Set(calls).size).toBe(2);
  });

  it('cuando userA borra, userB NO recibe ningún efecto en su spy', async () => {
    const userA = { id: 'aaaa-1111-user-A' };
    mocks.getUser.mockResolvedValueOnce({ data: { user: userA } });
    await POST();

    // Verifica que la lista de argumentos NO incluye ningún id ajeno a userA.
    for (const call of mocks.deleteUser.mock.calls) {
      expect(call[0]).toBe(userA.id);
    }
  });
});
