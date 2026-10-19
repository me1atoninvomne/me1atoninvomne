import "server-only";
import { AppError } from "./errors";

/**
 * Minimal in-memory rate limiter for public endpoints (per instance). For multi-instance
 * deployments replace it with a shared store (e.g. Redis) or the reverse proxy's limits.
 */
const buckets = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function rateLimit(req: Request, key: string, limit: number, windowMs: number) {
  if (process.env.NODE_ENV !== "production" || process.env.RATE_LIMIT === "off") return;
  const id = `${key}:${clientIp(req)}`;
  const now = Date.now();
  const hits = (buckets.get(id) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) throw new AppError("rate_limited", 429);
  hits.push(now);
  buckets.set(id, hits);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
}
