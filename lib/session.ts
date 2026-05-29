export const LOCAL_SESSION_STORAGE_KEY = 'bilclimb:session';
const LOCAL_SESSION_COOKIE_NAME = 'bilclimb_session';
const LOCAL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface LocalSession {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSeenAt: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getSessionId(email: string) {
  return encodeURIComponent(normalizeEmail(email));
}

function getExternalSessionId(provider: string, providerUserId: string) {
  return encodeURIComponent(`${provider}:${providerUserId}`);
}

function isLocalSession(value: unknown): value is LocalSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Partial<LocalSession>;

  return Boolean(
    session.id &&
      session.email &&
      session.name &&
      session.createdAt &&
      session.lastSeenAt
  );
}

function readSessionCookie() {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${LOCAL_SESSION_COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(
      decodeURIComponent(cookie.slice(LOCAL_SESSION_COOKIE_NAME.length + 1))
    );

    return isLocalSession(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function writeSessionCookie(session: LocalSession) {
  if (typeof document === 'undefined') {
    return;
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `${LOCAL_SESSION_COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify(session)
  )}; Max-Age=${LOCAL_SESSION_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

function clearSessionCookie() {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${LOCAL_SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function loadLocalSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(LOCAL_SESSION_STORAGE_KEY);

  if (!rawValue) {
    const cookieSession = readSessionCookie();

    if (cookieSession) {
      window.localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(cookieSession));
    }

    return cookieSession;
  }

  try {
    const session = JSON.parse(rawValue) as unknown;

    if (!isLocalSession(session)) {
      window.localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
      return readSessionCookie();
    }

    writeSessionCookie(session);
    return session;
  } catch {
    window.localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
    return readSessionCookie();
  }
}

export function saveLocalSession(session: LocalSession) {
  if (typeof window === 'undefined') {
    return session;
  }

  window.localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(session));
  writeSessionCookie(session);
  return session;
}

export function createLocalSession({
  email,
  name
}: {
  email: string;
  name: string;
}) {
  const normalizedEmail = normalizeEmail(email);
  const id = getSessionId(normalizedEmail);
  const now = new Date().toISOString();
  const currentSession = loadLocalSession();

  return saveLocalSession({
    id,
    email: normalizedEmail,
    name: name.trim() || normalizedEmail.split('@')[0] || 'climber',
    createdAt: currentSession?.id === id ? currentSession.createdAt : now,
    lastSeenAt: now
  });
}

export function createExternalSession({
  provider,
  providerUserId,
  email,
  name
}: {
  provider: string;
  providerUserId: string;
  email?: string | null;
  name?: string | null;
}) {
  const id = getExternalSessionId(provider, providerUserId);
  const normalizedEmail = normalizeEmail(email || `${providerUserId}@${provider}.local`);
  const now = new Date().toISOString();
  const currentSession = loadLocalSession();

  return saveLocalSession({
    id,
    email: normalizedEmail,
    name: name?.trim() || normalizedEmail.split('@')[0] || 'climber',
    createdAt: currentSession?.id === id ? currentSession.createdAt : now,
    lastSeenAt: now
  });
}

export function touchLocalSession() {
  const session = loadLocalSession();

  if (!session) {
    return null;
  }

  return saveLocalSession({
    ...session,
    lastSeenAt: new Date().toISOString()
  });
}

export function clearLocalSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
  clearSessionCookie();
}
