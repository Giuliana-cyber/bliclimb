import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isCronAuthorized } from './auth';

function makeRequest(authHeader: string | null): Request {
  const headers = new Headers();
  if (authHeader) headers.set('authorization', authHeader);
  return new Request('http://localhost/api/cron/x', { headers });
}

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'super-secret-token');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isCronAuthorized', () => {
  it('true cuando Authorization: Bearer <secret>', () => {
    expect(isCronAuthorized(makeRequest('Bearer super-secret-token'))).toBe(true);
  });

  it('false cuando el token no coincide', () => {
    expect(isCronAuthorized(makeRequest('Bearer wrong'))).toBe(false);
  });

  it('false sin header Authorization', () => {
    expect(isCronAuthorized(makeRequest(null))).toBe(false);
  });

  it('false con scheme distinto a Bearer', () => {
    expect(isCronAuthorized(makeRequest('Basic super-secret-token'))).toBe(false);
  });

  it('false si CRON_SECRET no está configurado', () => {
    vi.unstubAllEnvs();
    expect(isCronAuthorized(makeRequest('Bearer anything'))).toBe(false);
  });
});
