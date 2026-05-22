import mongoose from "mongoose";

declare global {
   
  var mongooseConn: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
    retryCount: number;
  };
}

import { env } from "@/env.mjs";
import { logger } from "@/lib/dev-logger";

const MONGODB_URI = env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // Exponential back-off: 1s, 2s, 4s

let cached = global.mongooseConn;

if (!cached) {
  cached = global.mongooseConn = { conn: null, promise: null, retryCount: 0 };
}

/**
 * MongoDB connection singleton for serverless environments.
 * Caches the connection across hot reloads in development
 * and across function invocations in production.
 * 
 * Includes connection state validation and retry limits
 * to prevent infinite reconnection loops.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  // Validate existing cached connection is still alive
  if (cached.conn) {
    const readyState = mongoose.connection.readyState;
    // 1 = connected, 2 = connecting
    if (readyState === 1) {
      return cached.conn;
    }
    if (readyState === 2) {
      // Currently connecting — wait for the existing promise
      if (cached.promise) {
        cached.conn = await cached.promise;
        return cached.conn;
      }
    }
    // readyState is 0 (disconnected) or 3 (disconnecting) — need to reconnect
    logger.warn("MongoDB cached connection is stale", { readyState });
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    // Check retry limits
    if (cached.retryCount >= MAX_RETRIES) {
      const err = new Error(
        `MongoDB connection failed after ${MAX_RETRIES} attempts. Not retrying.`
      );
      logger.error(err.message);
      throw err;
    }

    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 to avoid potential IPv6 handshake issues in some local envs
      maxPoolSize: 10,
      minPoolSize: 1,
    };

    const attemptNum = cached.retryCount + 1;
    logger.info(`MongoDB connection attempt ${attemptNum}/${MAX_RETRIES}`);

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      // Reset retry counter on successful connection
      cached.retryCount = 0;
      logger.info("MongoDB connected successfully");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.retryCount += 1;

    const delayMs = BASE_DELAY_MS * Math.pow(2, cached.retryCount - 1);
    logger.warn(
      `MongoDB connection attempt ${cached.retryCount}/${MAX_RETRIES} failed. ` +
      (cached.retryCount < MAX_RETRIES
        ? `Next retry in ${delayMs}ms.`
        : `Max retries reached.`),
      e instanceof Error ? e.message : e
    );

    // If we haven't exhausted retries, wait and try again
    if (cached.retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return connectToDatabase();
    }

    throw e;
  }

  return cached.conn;
}
