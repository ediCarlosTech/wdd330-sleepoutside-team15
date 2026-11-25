// A small in-memory limiter for sign-in attempts. It is per server process,
// which is fine for one server; several servers would need a shared store.
export function createLimiter({ max, windowMs }) {
  const entries = new Map();

  function current(key, now) {
    const entry = entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  }

  // forget old entries so the map cannot grow without bound
  function prune(now) {
    if (entries.size < 5000) {
      return;
    }
    entries.forEach((entry, key) => {
      if (entry.resetAt <= now) {
        entries.delete(key);
      }
    });
  }

  return {
    // seconds to wait before trying again, or 0 if allowed
    retryAfter(key, now = Date.now()) {
      const entry = current(key, now);
      return entry && entry.count >= max
        ? Math.ceil((entry.resetAt - now) / 1000)
        : 0;
    },
    // count one attempt
    hit(key, now = Date.now()) {
      prune(now);
      const entry = current(key, now) ?? { count: 0, resetAt: now + windowMs };
      entry.count += 1;
      entries.set(key, entry);
    },
    reset(key) {
      entries.delete(key);
    },
  };
}
