// Small in-memory rate limiter shared by the API routes.
// It lives in one server process, so on serverless hosts it is only a per-instance guard (each warm
// instance has its own counters). It stops a runaway loop; it is not a spending cap.

/**
 * The address to count requests against.
 * Only headers that the hosting platform sets are used: `x-vercel-forwarded-for` on Vercel, otherwise the
 * LAST `x-forwarded-for` entry (the one the nearest proxy appended). The first entry is whatever the
 * caller wrote, so trusting it would let anyone pick a fresh limit bucket on every request.
 * With no proxy in front (local dev) every request shares the "unknown" bucket.
 */
export function clientKey(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim();
  if (vercel) return vercel;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return forwarded?.length ? forwarded[forwarded.length - 1] : "unknown";
}

/** Allows `limit` hits per `windowMs` for each key. Old keys are dropped and the map is size-capped. */
export function createRateLimiter({ limit, windowMs, maxKeys = 5000 }: { limit: number; windowMs: number; maxKeys?: number }) {
  const hits = new Map<string, number[]>();

  return function rateLimited(key: string): boolean {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.delete(key); // re-insert so the Map stays ordered oldest-first
    hits.set(key, recent);

    if (hits.size > maxKeys) {
      for (const [k, times] of hits) {
        if (now - times[times.length - 1] >= windowMs) hits.delete(k);
      }
      // Still too many live keys (a flood): evict the oldest ones.
      for (const k of hits.keys()) {
        if (hits.size <= maxKeys) break;
        hits.delete(k);
      }
    }
    return recent.length > limit;
  };
}
