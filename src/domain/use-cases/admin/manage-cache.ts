"use server";

import { redis, cacheInvalidatePattern } from "@/lib/redis";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { devlogger } from "@/lib/devlogger";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can perform this action");
  }
  return session;
}

/**
 * Fetches statistics from Redis for dashboard visualization.
 */
export async function getCacheStats() {
  await checkAdmin();
  
  if (!redis) {
    return {
      available: false,
      totalKeys: 0,
      segments: []
    };
  }

  try {
    // Helper to fully scan a pattern
    const scanAll = async (pattern: string) => {
      let cursor = "0";
      const allKeys: string[] = [];
      do {
        const [nextCursor, keys] = await redis!.scan(cursor, { match: pattern, count: 500 });
        allKeys.push(...keys);
        cursor = nextCursor;
      } while (cursor !== "0"  && cursor !== "");
      return allKeys;
    };

    const [formKeys, fieldKeys, listKeys, subKeys, countKeys] = await Promise.all([
      scanAll("form:*"),
      scanAll("fields:*"),
      scanAll("submissions:list:*"),
      scanAll("submission:*"),
      scanAll("submissions:counts")
    ]);

    const total = formKeys.length + fieldKeys.length + listKeys.length + subKeys.length + countKeys.length;

    return {
      available: true,
      totalKeys: total,
      segments: [
        { label: "Forms & Templates", count: formKeys.length + fieldKeys.length, color: "blue" },
        { label: "Submissions Hub", count: listKeys.length + countKeys.length, color: "green" },
        { label: "Active Client Sessions", count: subKeys.length, color: "purple" }
      ]
    };
  } catch (error) {
    devlogger.error("Failed to fetch cache stats", error);
    return { available: false, totalKeys: 0, segments: [] };
  }
}

/**
 * Clears specific segments of the application cache.
 */
export async function clearCacheGroup(type: "all" | "forms" | "submissions") {
  await checkAdmin();
  
  if (!redis) return { success: false, message: "Redis not configured" };

  try {
    if (type === "all") {
      await redis.flushdb();
    } else if (type === "forms") {
      await cacheInvalidatePattern("form:*");
      await cacheInvalidatePattern("fields:*");
    } else if (type === "submissions") {
      await cacheInvalidatePattern("submissions:*");
      await cacheInvalidatePattern("submission:*");
    }

    revalidatePath("/admin", "layout");
    return { success: true, message: `Cache segment '${type}' cleared successfully.` };
  } catch (error) {
    devlogger.error(`Failed to clear cache group: ${type}`, error);
    return { success: false, message: "Execution error during cache cleanup." };
  }
}

/**
 * Lists all keys matching a specific pattern.
 */
export async function listCacheKeys(pattern: string = "*") {
  await checkAdmin();
  if (!redis) return [];

  try {
    let cursor = "0";
    const allKeys: string[] = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 500 });
      allKeys.push(...keys);
      cursor = nextCursor;
    } while (cursor !== "0" && cursor !== "");
    return allKeys;
  } catch (error) {
    devlogger.error("Failed to list cache keys", error);
    return [];
  }
}

/**
 * Fetches the raw value and TTL of a specific key.
 */
export async function getCacheValue(key: string) {
  await checkAdmin();
  if (!redis) return null;

  try {
    const value = await redis.get(key);
    // redis.ttl returns -1 for no expiry, -2 for non-existent
    const ttl = await redis.ttl(key);
    return { value, ttl };
  } catch (error) {
    devlogger.error(`Failed to get cache value for key: ${key}`, error);
    return null;
  }
}

/**
 * Updates or creates a cache key with a specific value and optional TTL.
 */
export async function updateCacheValue(key: string, value: any, ttlSeconds?: number) {
  await checkAdmin();
  if (!redis) throw new Error("Redis not configured");

  try {
    // If it's a string, try to parse it if it looks like JSON to ensure we store it correctly
    // But since Upstash Redis lib handles objects, we just pass it
    // If ttlSeconds is 0 or less, we set without expiry (persistent)
    const options: any = {};
    if (ttlSeconds && ttlSeconds > 0) {
      options.ex = ttlSeconds;
    }

    await redis.set(key, value, options);
    return { success: true };
  } catch (error) {
    devlogger.error(`Failed to update cache key: ${key}`, error);
    throw error;
  }
}

/**
 * Deletes a specific cache key.
 */
export async function deleteCacheKey(key: string) {
  await checkAdmin();
  if (!redis) throw new Error("Redis not configured");

  try {
    await redis.del(key);
    return { success: true };
  } catch (error) {
    devlogger.error(`Failed to delete cache key: ${key}`, error);
    throw error;
  }
}
