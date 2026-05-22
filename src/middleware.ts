import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "@/i18n/routing";
import { detectMaliciousContent } from "@/lib/api-security";
import { logger } from "./lib/dev-logger";

type RateBucket = {
  count: number;
  resetAt: number;
};

declare global {
  var __scctApiRateLimitStore: Map<string, RateBucket> | undefined;
}

const intlMiddleware = createMiddleware(routing);

const defaultAllowedApiOrigins = [
  "https://scct-damages.vercel.app",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "http://localhost:3000",
  "https://localhost",
  "https://localhost:3000",
];

const parseOrigins = (raw: string | undefined) => 
  (raw ?? "").split(",").map(s => s.trim()).filter(Boolean);

const allowedApiOrigins = new Set([
  ...defaultAllowedApiOrigins,
  ...parseOrigins(process.env.APP_ALLOWED_ORIGINS),
  ...parseOrigins(process.env.APP_WEBVIEW_ALLOWED_ORIGINS),
  ...parseOrigins(process.env.NEXT_PUBLIC_APP_URL),
]);

const rateLimitStore = globalThis.__scctApiRateLimitStore ?? new Map<string, RateBucket>();
if (!globalThis.__scctApiRateLimitStore) {
  globalThis.__scctApiRateLimitStore = rateLimitStore;
}

function readNumberEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function cleanupRateLimitStore(now: number) {
  if (rateLimitStore.size < 5000) return;
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

function getRateLimitConfig(pathname: string) {
  const defaultWindowMs = readNumberEnv("API_RATE_LIMIT_WINDOW_MS", 60_000, 1_000, 86_400_000);
  const defaultMax = readNumberEnv("API_RATE_LIMIT_MAX_REQUESTS", 120, 1, 100_000);

  if (pathname.startsWith("/api/admin")) {
    return {
      windowMs: readNumberEnv("API_RATE_LIMIT_ADMIN_WINDOW_MS", defaultWindowMs, 1_000, 86_400_000),
      maxRequests: readNumberEnv("API_RATE_LIMIT_ADMIN_MAX_REQUESTS", defaultMax, 1, 100_000),
      scope: "admin",
    };
  }

  if (pathname.startsWith("/api/auth")) {
    return {
      windowMs: readNumberEnv("API_RATE_LIMIT_AUTH_WINDOW_MS", defaultWindowMs, 1_000, 86_400_000),
      maxRequests: readNumberEnv("API_RATE_LIMIT_AUTH_MAX_REQUESTS", 30, 1, 100_000),
      scope: "auth",
    };
  }

  return {
    windowMs: readNumberEnv("API_RATE_LIMIT_PUBLIC_WINDOW_MS", defaultWindowMs, 1_000, 86_400_000),
    maxRequests: readNumberEnv("API_RATE_LIMIT_PUBLIC_MAX_REQUESTS", defaultMax, 1, 100_000),
    scope: "public",
  };
}

function applyRateLimit(request: NextRequest) {
  const now = Date.now();
  cleanupRateLimitStore(now);

  const pathname = request.nextUrl.pathname;
  const { windowMs, maxRequests, scope } = getRateLimitConfig(pathname);
  const ip = getClientIp(request);
  const key = `${scope}:${pathname}:${ip}`;

  const existing = rateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - 1),
      resetAt,
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  const remaining = Math.max(0, maxRequests - existing.count);
  return {
    allowed: existing.count <= maxRequests,
    limit: maxRequests,
    remaining,
    resetAt: existing.resetAt,
  };
}

function withRateLimitHeaders(response: NextResponse, rate: { limit: number; remaining: number; resetAt: number }) {
  response.headers.set("X-RateLimit-Limit", String(rate.limit));
  response.headers.set("X-RateLimit-Remaining", String(rate.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.floor(rate.resetAt / 1000)));
  return response;
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (allowedApiOrigins.has(origin)) return true;

  // Allow localhost with any port
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;

  return false;
}

function withApiCorsHeaders(response: NextResponse, origin: string | null) {
  response.headers.append("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,X-CSRF-Token,Accept,Origin");
  response.headers.set("Access-Control-Max-Age", "86400");

  if (isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin!);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  } else if (origin) {
    logger.debug(`Origin ${origin} not explicitly allowed in CORS check`);
  }

  return response;
}

async function handleApiSecurity(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return withApiCorsHeaders(new NextResponse(null, { status: 204 }), origin);
  }

  const pathThreat = detectMaliciousContent(pathname, "path");
  if (pathThreat) {
    return withApiCorsHeaders(
      NextResponse.json(
      {
        success: false,
        error: "Potential malicious request path detected",
        code: "MALICIOUS_REQUEST_PATH",
      },
      { status: 400 },
      ),
      origin,
    );
  }

  const querySnapshot: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    querySnapshot[key] = value;
  });

  const queryThreat = detectMaliciousContent(querySnapshot, "query");
  if (queryThreat) {
    return withApiCorsHeaders(
      NextResponse.json(
      {
        success: false,
        error: "Potential malicious query payload detected",
        code: "MALICIOUS_QUERY_DETECTED",
      },
      { status: 400 },
      ),
      origin,
    );
  }

  const rate = applyRateLimit(request);
  if (!rate.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000));
    const response = NextResponse.json(
      {
        success: false,
        error: "Too many requests",
        code: "RATE_LIMITED",
      },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(retryAfter));
    return withApiCorsHeaders(withRateLimitHeaders(response, rate), origin);
  }

  if (pathname.startsWith("/api/admin")) {
    const secureCookie =
      request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production";

    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie,
    });

    if (!token) {
      const response = NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
      return withApiCorsHeaders(withRateLimitHeaders(response, rate), origin);
    }

    if (token.role !== "admin") {
      const response = NextResponse.json(
        {
          success: false,
          error: "Insufficient role permissions",
          code: "FORBIDDEN",
        },
        { status: 403 },
      );
      return withApiCorsHeaders(withRateLimitHeaders(response, rate), origin);
    }
  }

  const next = NextResponse.next();
  return withApiCorsHeaders(withRateLimitHeaders(next, rate), origin);
}

export default async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    return handleApiSecurity(request);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames except Next.js internals and static assets.
    "/((?!_next|.*\\..*).*)",
  ],
};
