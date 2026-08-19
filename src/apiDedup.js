/** Coalesce identical in-flight API calls (same fn + payload). */

const inFlight = new Map();
const responseCache = new Map();
const READ_CACHE_MS = 12000;
const READ_CACHE_FNS = new Set(['getBootstrap', 'listStickyNotes', 'getTaskActivity']);

function requestKey(fnName, payload) {
  try {
    return `${fnName}:${JSON.stringify(payload ?? {})}`;
  } catch {
    return `${fnName}:`;
  }
}

export function dedupeInFlight(fnName, payload, run) {
  const key = requestKey(fnName, payload);
  const existing = inFlight.get(key);
  if (existing) return existing;

  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.at < READ_CACHE_MS && READ_CACHE_FNS.has(fnName)) {
    return Promise.resolve(cached.value);
  }

  const promise = Promise.resolve().then(run).then((value) => {
    if (READ_CACHE_FNS.has(fnName)) {
      responseCache.set(key, { at: Date.now(), value });
    }
    return value;
  }).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}
