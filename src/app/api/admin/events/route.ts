import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { ADMIN_CHANNEL } from "@/lib/events/publisher";
import { errorResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type EventPayload = {
  timestamp?: string;
  [key: string]: unknown;
};

function parseEvent(raw: unknown): EventPayload | null {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === "object" && parsed !== null ? (parsed as EventPayload) : null;
    } catch {
      return null;
    }
  }

  if (typeof raw === "object" && raw !== null) {
    return raw as EventPayload;
  }

  return null;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  
  if (!redis) {
    return errorResponse("Notifications service unavailable", 503, "NOTIFICATIONS_UNAVAILABLE");
  }
  const redisClient = redis;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      sendEvent({ type: "CONNECTION_ESTABLISHED" });

      let active = true;
      let lastChecked = Date.now();
      let polling = false;
      let interval: ReturnType<typeof setInterval> | null = null;

      const cleanup = () => {
        active = false;
        if (interval) {
          clearInterval(interval);
        }
      };

      request.signal.addEventListener("abort", cleanup, { once: true });

      interval = setInterval(async () => {
        if (!active || polling) {
          return;
        }

        polling = true;
        try {
          const rawEvents = await redisClient.lrange<unknown>(ADMIN_CHANNEL, -5, -1);
          if (rawEvents && Array.isArray(rawEvents)) {
            for (const evStr of rawEvents) {
              const ev = parseEvent(evStr);
              if (!ev?.timestamp) {
                continue;
              }

              const evTime = new Date(ev.timestamp).getTime();
              if (Number.isNaN(evTime)) {
                continue;
              }

              if (evTime > lastChecked) {
                sendEvent(ev);
                lastChecked = evTime;
              }
            }
          }
        } catch (error) {
          logger.debug("SSE polling iteration failed", error);
        } finally {
          polling = false;
        }
      }, 5000);

      sendEvent({ type: "KEEP_ALIVE" });
    },
    cancel() {
      logger.debug("SSE stream cancelled by client");
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
