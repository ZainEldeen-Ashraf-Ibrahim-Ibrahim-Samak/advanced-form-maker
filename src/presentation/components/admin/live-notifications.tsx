"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import type { AdminNotification } from "@/lib/events/publisher";
import Link from "next/link";
import { logger } from "@/lib/dev-logger";

export function LiveNotifications() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const t = useTranslations("notifications");

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    
    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource("/api/admin/events");
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "CONNECTION_ESTABLISHED" || data.type === "PING" || data.type === "keep-alive") {
            return;
          }

          const notification = data as AdminNotification;

          // Do not show an empty toast if there's no valid title or message to display
          if (!notification.title && !notification.message) {
            return;
          }

          if (notification.type === "NEW_SUBMISSION") {
            window.dispatchEvent(new CustomEvent("submissions-updated"));
          }

          toast.custom((toastId) => (
            <div className="flex items-start gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg w-[350px]">
              <div className="bg-primary/10 text-primary p-2 rounded-full mt-0.5">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-sm">{notification.title}</p>
                <p className="text-xs text-zinc-500 whitespace-pre-wrap">{notification.message}</p>
                
                {notification.link && (
                  <div className="pt-2">
                    <Link 
                      href={notification.link}
                      onClick={() => toast.dismiss(toastId)} 
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t("viewDetails")}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ), { duration: 6000 });

        } catch (e) {
          logger.error("Failed to parse SSE event", e);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        logger.warn("SSE connection dropped, reconnecting in 3 seconds");
        reconnectTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return null; // pure headless background component
}
