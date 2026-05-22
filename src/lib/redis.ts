import { Redis } from "@upstash/redis";

import { env } from "@/env.mjs";
import { logger } from "@/lib/dev-logger";

const UPSTASH_REDIS_REST_URL = env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = env.UPSTASH_REDIS_REST_TOKEN;

function createRedisClient(): Redis | null {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    logger.warn("Upstash Redis not configured. Caching and rate limiting will be disabled.");
    return null;
  }

  return new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
  });
}

/** Upstash Redis client singleton. May be null if not configured. */
export const redis = createRedisClient();

function decodeCachedValue<T>(cached: unknown): T {
  let value: unknown = cached;

  for (let i = 0; i < 2; i++) {
    if (typeof value !== "string") {
      return value as T;
    }

    const normalized = value.trim();
    if (normalized.length === 0) {
      return value as T;
    }

    const firstChar = normalized[0];
    const isLikelyJson =
      firstChar === "{" ||
      firstChar === "[" ||
      firstChar === "\"" ||
      firstChar === "n" ||
      firstChar === "t" ||
      firstChar === "f" ||
      firstChar === "-" ||
      (firstChar >= "0" && firstChar <= "9");

    if (!isLikelyJson) {
      return value as T;
    }

    try {
      value = JSON.parse(normalized);
    } catch {
      return value as T;
    }
  }

  return value as T;
}

/**
 * Cache helper: get a value from Redis, or compute and store it.
 * Falls back to direct computation if Redis is unavailable.
 */
export async function cacheGet<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> {
  if (!redis) {
    return compute();
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return decodeCachedValue<T>(cached);
    }
  } catch {
    // Redis unavailable, fall through to compute
  }

  const value = await compute();

  try {
    await redis.set(key, value as unknown, { ex: ttlSeconds });
  } catch {
    // Redis unavailable, silently continue
  }

  return value;
}

/**
 * Cache helper: invalidate one or more cache keys.
 */
export async function cacheInvalidate(...keys: string[]): Promise<void> {
  if (!redis) return;

  try {
    await Promise.all(keys.map((key) => redis!.del(key)));
  } catch {
    // Redis unavailable, silently continue
  }
}

/**
 * Cache helper: invalidate all keys matching a pattern.
 * Uses SCAN to find matching keys (Upstash-compatible).
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  if (!redis) return;

  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: pattern,
        count: 100,
      });
      cursor = nextCursor;
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => redis!.del(key)));
      }
    } while (cursor !== "0");
  } catch {
    // Redis unavailable, silently continue
  }
}

/** Cache key builders per data-model.md */
export const CacheKeys = {
  activeForm: () => "form:active",
  fields: (formTemplateId: string) => `fields:${formTemplateId}`,
  submissionsList: (status: string, page: number) =>
    `submissions:list:${status}:${page}`,
  submissionsCounts: () => "submissions:counts",
  submission: (accessToken: string) => `submission:${accessToken}`,
} as const;

/** TTL values in seconds per data-model.md */
export const CacheTTL = {
  FORM: 300, // 5 minutes
  FIELDS: 300, // 5 minutes
  SUBMISSIONS_LIST: 60, // 1 minute
  SUBMISSIONS_COUNTS: 30, // 30 seconds
  SUBMISSION: 120, // 2 minutes
} as const;
