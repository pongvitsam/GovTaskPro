/** Coalesce identical in-flight API calls (same fn + payload). */

const inFlight = new Map();

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

  const promise = Promise.resolve().then(run).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}
