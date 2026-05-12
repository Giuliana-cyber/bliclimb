import { loadLocalSession, LOCAL_SESSION_STORAGE_KEY } from '@/lib/session';

const GLOBAL_STORAGE_KEYS = new Set([LOCAL_SESSION_STORAGE_KEY, 'bilclimb:last-preapproval-id']);

function shouldScopeStorageKey(key: string) {
  return key.startsWith('bilclimb:') && !GLOBAL_STORAGE_KEYS.has(key);
}

function getSessionStorageKey(key: string) {
  if (typeof window === 'undefined' || !shouldScopeStorageKey(key)) {
    return key;
  }

  const session = loadLocalSession();

  if (!session) {
    return key;
  }

  return `bilclimb:user:${session.id}:${key}`;
}

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const storageKey = getSessionStorageKey(key);
  const rawValue =
    window.localStorage.getItem(storageKey) ??
    (storageKey !== key ? window.localStorage.getItem(key) : null);

  if (!rawValue) {
    return fallback;
  }

  try {
    if (storageKey !== key && !window.localStorage.getItem(storageKey)) {
      window.localStorage.setItem(storageKey, rawValue);
    }

    return JSON.parse(rawValue) as T;
  } catch {
    window.localStorage.removeItem(storageKey);
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getSessionStorageKey(key), JSON.stringify(value));
}

export function removeStorage(key: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = getSessionStorageKey(key);

  window.localStorage.removeItem(storageKey);

  if (storageKey !== key) {
    window.localStorage.removeItem(key);
  }
}
