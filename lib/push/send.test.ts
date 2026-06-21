import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock web-push antes de importar el módulo.
const sendNotificationMock = vi.fn();
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => sendNotificationMock(...args)
  }
}));

import { sendPushToUser } from './send';

type SubRow = {
  id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
};

function createFakeClient(subs: SubRow[]) {
  const deletedIds: string[] = [];
  const client = {
    from: (table: string) => {
      if (table !== 'push_subscriptions') throw new Error(`tabla: ${table}`);
      let mode: 'select' | 'delete' | null = null;
      const filters: Array<{ col: string; value: unknown }> = [];
      const builder: any = {};
      builder.select = () => {
        mode = 'select';
        return builder;
      };
      builder.delete = () => {
        mode = 'delete';
        return builder;
      };
      builder.eq = (col: string, value: unknown) => {
        filters.push({ col, value });
        if (mode === 'delete') {
          const id = filters.find((f) => f.col === 'id')?.value;
          if (typeof id === 'string') deletedIds.push(id);
        }
        return builder;
      };
      builder.then = (resolve: any) => {
        if (mode === 'select') {
          return Promise.resolve(resolve({ data: subs, error: null }));
        }
        if (mode === 'delete') {
          return Promise.resolve(resolve({ data: null, error: null }));
        }
        return Promise.resolve(resolve({ data: null, error: null }));
      };
      return builder;
    }
  } as any;
  return { client, deletedIds };
}

beforeEach(() => {
  vi.stubEnv('VAPID_PUBLIC_KEY', 'pub');
  vi.stubEnv('VAPID_PRIVATE_KEY', 'priv');
  vi.stubEnv('VAPID_SUBJECT', 'mailto:soporte@belaypartners.org');
  sendNotificationMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sendPushToUser', () => {
  it('manda push a cada subscripción y devuelve sent=N', async () => {
    sendNotificationMock.mockResolvedValue({ statusCode: 201 });
    const { client } = createFakeClient([
      { id: 's1', endpoint: 'https://ep1', p256dh_key: 'k1', auth_key: 'a1' },
      { id: 's2', endpoint: 'https://ep2', p256dh_key: 'k2', auth_key: 'a2' }
    ]);
    const result = await sendPushToUser('u1', { title: 'T', body: 'B' }, client);
    expect(result).toEqual({ sent: 2, failed: 0, removed: 0 });
    expect(sendNotificationMock).toHaveBeenCalledTimes(2);
  });

  it('borra subs con 410 Gone', async () => {
    sendNotificationMock.mockImplementation(() => {
      const err = new Error('gone') as Error & { statusCode: number };
      err.statusCode = 410;
      throw err;
    });
    const { client, deletedIds } = createFakeClient([
      { id: 's1', endpoint: 'https://ep1', p256dh_key: 'k1', auth_key: 'a1' }
    ]);
    const result = await sendPushToUser('u1', { title: 'T', body: 'B' }, client);
    expect(result).toEqual({ sent: 0, failed: 0, removed: 1 });
    expect(deletedIds).toContain('s1');
  });

  it('borra subs con 404 también', async () => {
    sendNotificationMock.mockImplementation(() => {
      const err = new Error('not found') as Error & { statusCode: number };
      err.statusCode = 404;
      throw err;
    });
    const { client, deletedIds } = createFakeClient([
      { id: 's1', endpoint: 'https://ep1', p256dh_key: 'k1', auth_key: 'a1' }
    ]);
    const result = await sendPushToUser('u1', { title: 'T', body: 'B' }, client);
    expect(result.removed).toBe(1);
    expect(deletedIds).toContain('s1');
  });

  it('otros errores cuentan como failed pero no borran', async () => {
    sendNotificationMock.mockImplementation(() => {
      const err = new Error('boom') as Error & { statusCode: number };
      err.statusCode = 500;
      throw err;
    });
    const { client, deletedIds } = createFakeClient([
      { id: 's1', endpoint: 'https://ep1', p256dh_key: 'k1', auth_key: 'a1' }
    ]);
    const result = await sendPushToUser('u1', { title: 'T', body: 'B' }, client);
    expect(result.failed).toBe(1);
    expect(deletedIds).toHaveLength(0);
  });

  it('skip cuando VAPID no está configurada', async () => {
    vi.unstubAllEnvs();
    const { client } = createFakeClient([
      { id: 's1', endpoint: 'https://ep1', p256dh_key: 'k1', auth_key: 'a1' }
    ]);
    const result = await sendPushToUser('u1', { title: 'T', body: 'B' }, client);
    expect(result).toEqual({ sent: 0, failed: 0, removed: 0 });
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });
});
