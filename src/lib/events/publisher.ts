import { redis } from "@/lib/redis";
import { logger } from "@/lib/dev-logger";
import Pusher from "pusher";

const pusher = process.env.PUSHER_KEY 
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    })
  : null;

export interface AdminNotification {
  type: "NEW_SUBMISSION" | "SYSTEM_ALERT";
  title: string;
  message: string;
  timestamp: string;
  link?: string;
}

export const ADMIN_CHANNEL = "admin_notifications";
export const CONTACT_FORM_UPDATES_CHANNEL = "contact_form_updates";

export const NotificationPublisher = {
  async notifyAdmins(notification: Omit<AdminNotification, "timestamp">) {
    if (!redis) {
      logger.warn("Redis client not configured. Notifications disabled.");
      return;
    }

    const payload: AdminNotification = {
      ...notification,
      timestamp: new Date().toISOString(),
    };

    try {
      // Use a list for event streaming since Upstash REST does not support blocking SUBSCRIBE
      await redis.rpush(ADMIN_CHANNEL, JSON.stringify(payload));
      // Keep only last 100 notifications
      await redis.ltrim(ADMIN_CHANNEL, -100, -1);

      // REAL-TIME SIGNAL
      if (pusher) {
        await pusher.trigger(ADMIN_CHANNEL, "notification", payload);
      }
    } catch (error) {
      logger.error("Failed to publish notification to Upstash Redis or Pusher", error);
    }
  },

  async notifyClientStatusChange(
    token: string,
    status: string,
    requestStatus?: "pending_delivery" | "delivered" | "seen" | "expired",
  ) {
    if (!redis) return;
    
    const channel = `submission_updates:${token}`;
    const payload = {
      type: "STATUS_CHANGED",
      status,
      requestStatus,
      timestamp: new Date().toISOString(),
    };

    try {
      await redis.rpush(channel, JSON.stringify(payload));
      await redis.ltrim(channel, -100, -1);
      // Keep stream available for offline users within the 7-day requirement window
      await redis.expire(channel, 60 * 60 * 24 * 7);

      // REAL-TIME SIGNAL
      if (pusher) {
        await pusher.trigger(`submission-${token}`, "status-updated", payload);
      }
    } catch (error) {
      logger.error("Failed to publish client update signal", { token, error });
    }
  },

  async notifyContactFormUpdated(formId: string) {
    if (!redis) return;

    const payload = {
      type: "CONTACT_FORM_UPDATED",
      formId,
      timestamp: new Date().toISOString(),
    };

    try {
      await redis.rpush(CONTACT_FORM_UPDATES_CHANNEL, JSON.stringify(payload));
      await redis.ltrim(CONTACT_FORM_UPDATES_CHANNEL, -100, -1);
      await redis.expire(CONTACT_FORM_UPDATES_CHANNEL, 60 * 60 * 24 * 7);
    } catch (error) {
      logger.error("Failed to publish contact form update signal", { formId, error });
    }
  }
};
