import { Redis } from "npm:@upstash/redis@1.35.6";
import { Ratelimit } from "npm:@upstash/ratelimit@2.0.5";

type LimitKind = "ip" | "identity";

interface LimitOptions {
  endpoint: string;
  limit: number;
  window: `${number} ${"s" | "m" | "h" | "d"}`;
  kind: LimitKind;
  key: string;
}

export interface LimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  reset: number;
  retryAfterSec: number;
}

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL"),
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN"),
});

const limiterCache = new Map<string, Ratelimit>();

function getLimiter(limit: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  const cacheKey = `${limit}-${window}`;
  const existing = limiterCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(limit, window),
    analytics: true,
    prefix: "rl",
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

export async function applyRateLimit(options: LimitOptions): Promise<LimitResult> {
  const { endpoint, limit, window, kind, key } = options;
  const limiter = getLimiter(limit, window);
  const id = `${endpoint}:${kind}:${key}`;
  const result = await limiter.limit(id);
  const retryAfterSec = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));

  return {
    success: result.success,
    remaining: result.remaining,
    limit: result.limit,
    reset: result.reset,
    retryAfterSec,
  };
}

export async function dedupeEvent(eventKey: string, ttlSeconds: number): Promise<boolean> {
  const dedupeKey = `dedupe:${eventKey}`;
  const setResult = await redis.set(dedupeKey, "1", { nx: true, ex: ttlSeconds });
  return setResult === "OK";
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function rateLimitHeaders(result: LimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.reset / 1000)),
    "Retry-After": String(result.retryAfterSec),
  };
}
