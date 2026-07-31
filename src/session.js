const SESSION_KEY = 'gtp_session_v1';
const BOOT_CACHE_KEY = 'gtp_client_boot_v1';
const BOOT_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

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
  clearBootstrapCache();
}

/** Short-lived bootstrap cache — speeds up re-login / page refresh */
export function bootstrapCacheAgeMs() {
  try {
    const raw = localStorage.getItem(BOOT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt) return null;
    return Date.now() - parsed.savedAt;
  } catch {
    return null;
  }
}

export function readBootstrapCache() {
  try {
    const raw = localStorage.getItem(BOOT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data?.users || !parsed?.savedAt) return null;
    if (Date.now() - parsed.savedAt > BOOT_CACHE_MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeBootstrapCache(data) {
  if (!data?.users) return;
  try {
    localStorage.setItem(BOOT_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* quota / private mode */
  }
}

export function clearBootstrapCache() {
  try {
    localStorage.removeItem(BOOT_CACHE_KEY);
  } catch {
    /* ignore */
  }
}
