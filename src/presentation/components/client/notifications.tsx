"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, MessageCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface NotificationsProps {
  token: string;
}

export function ClientNotifications({ token }: NotificationsProps) {
  const t = useTranslations("client");
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch(`/api/user/notifications?token=${token}`);
        const data = await res.json();
        if (data.success && data.data.notifications.length > 0) {
          setNotifications(data.data.notifications);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    }
    fetchNotifications();
  }, [token]);

  const markAsSeen = async (id: string) => {
    try {
      await fetch(`/api/user/notifications?id=${id}&token=${token}`, { method: "PATCH" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to mark as seen", err);
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="mb-6 space-y-4 max-w-4xl mx-auto">
      {notifications.map((notification) => (
        <Alert key={notification.id} className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
          <MessageCircle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold">
            {t("resubmissionRequested")}
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200 mt-2 flex flex-col gap-3">
            <p>
              {notification.requestedByAdminName} {t("requestedResubmissionMessage")}
            </p>
            {notification.comment && (
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-md italic">
                "{notification.comment}"
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-fit border-amber-400 hover:bg-amber-100 dark:border-amber-600 dark:hover:bg-amber-900/50 mt-1"
              onClick={() => markAsSeen(notification.id)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {t("markAsSeen")}
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
