export const LOCAL_SESSION_STORAGE_KEY = 'bilclimb:session';

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

export function loadLocalSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(LOCAL_SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const session = JSON.parse(rawValue) as LocalSession;

    if (!session.email || !session.id) {
      window.localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    window.localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveLocalSession(session: LocalSession) {
  if (typeof window === 'undefined') {
    return session;
  }

  window.localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(session));
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
}
