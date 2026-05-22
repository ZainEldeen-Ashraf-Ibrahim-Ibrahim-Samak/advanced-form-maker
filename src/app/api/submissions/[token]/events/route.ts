import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { errorResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { MongoSubmissionRepository } from "@/data/repositories/mongo-submission-repository";
import { CONTACT_FORM_UPDATES_CHANNEL } from "@/lib/events/publisher";

export const dynamic = "force-dynamic";

const submissionRepo = new MongoSubmissionRepository();

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  
  if (!redis) {
    return errorResponse("Notifications service unavailable", 503, "NOTIFICATIONS_UNAVAILABLE");
  }
  
  const redisClient = redis;
  const channel = `submission_updates:${token}`;
  const contactFormUpdatesChannel = CONTACT_FORM_UPDATES_CHANNEL;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      sendEvent({ type: "CONNECTION_ESTABLISHED", token });

      try {
        const submission = await submissionRepo.findByToken(token);
        if (submission) {
          sendEvent({
            type: "STATUS_CHANGED",
            status: submission.status,
            requestStatus: submission.resubmissionRequest?.status,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.debug("Unable to preload submission request status", { token, error });
      }

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
          const rawEvents = await redisClient.lrange<unknown>(channel, -3, -1);
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

          const rawContactFormEvents = await redisClient.lrange<unknown>(contactFormUpdatesChannel, -3, -1);
          if (rawContactFormEvents && Array.isArray(rawContactFormEvents)) {
            for (const evStr of rawContactFormEvents) {
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
          logger.debug("Client SSE polling iteration failed", { token, error });
        } finally {
          polling = false;
        }
      }, 5000); // Poll Redis every 5 seconds for status changes

      sendEvent({ type: "KEEP_ALIVE" });
    },
    cancel() {
      logger.debug("Client SSE stream cancelled", { token });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
