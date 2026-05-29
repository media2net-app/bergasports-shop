import "server-only";

import { clientKeyFromRequest } from "@/lib/request-client-key";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000;

export function productVisualizeRateLimitPerHour(): number {
  const raw = process.env.PRODUCT_VISUALIZE_RATE_LIMIT_PER_HOUR?.trim();
  const n = raw ? Number(raw) : 8;
  return Number.isFinite(n) && n > 0 ? Math.min(50, Math.floor(n)) : 8;
}

export function checkProductVisualizeRateLimit(
  clientKey: string,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const limit = productVisualizeRateLimitPerHour();
  const now = Date.now();
  const key = `pv:${clientKey.slice(0, 120) || "anonymous"}`;

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { ok: true };
}

