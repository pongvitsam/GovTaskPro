const SESSION_KEY = 'gtp_session_v1';

/** Persist login per browser/device (each device keeps its own session). */
export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.userId) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSession(user) {
  if (!user?.id) return;
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        userId: user.id,
        username: user.username || '',
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    /* private mode / quota — login still works for this tab */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
