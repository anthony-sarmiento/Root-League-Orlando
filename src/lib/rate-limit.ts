/**
 * A small in-memory rate limiter for sign-in and sign-up. It is a best-effort second line behind Supabase's own
 * limits: each server instance counts separately and forgets on restart, but that is enough to blunt a quick burst
 * of password guesses or fake sign-ups from one address.
 */
const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

/** Records an attempt and says whether it is allowed: at most `limit` attempts per `windowMs` for this key. */
export function allowAttempt(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  // Re-insert so the most recently used keys sit at the end; the oldest are dropped when the map grows too big.
  hits.delete(key);
  hits.set(key, recent);
  if (hits.size > MAX_KEYS) {
    for (const oldest of hits.keys()) {
      hits.delete(oldest);
      if (hits.size <= MAX_KEYS * 0.9) break;
    }
  }
  return true;
}

/** The visitor's address as the hosting platform reports it (the first hop of x-forwarded-for), or a shared bucket. */
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** For tests. */
export function resetRateLimits() {
  hits.clear();
}
