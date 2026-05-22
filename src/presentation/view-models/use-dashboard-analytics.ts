import { useState, useEffect } from "react";
import { StorageUsageMetrics } from "@/domain/repositories/storage-repository";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function useDashboardAnalytics() {
  const t = useTranslations("adminDashboard");
  const [cloudinaryUsage, setCloudinaryUsage] = useState<StorageUsageMetrics | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/admin/analytics/cloudinary-usage");
        if (!res.ok) throw new Error("Failed to load usage metrics");
        const data = await res.json();
        setCloudinaryUsage(data);
      } catch (err) {
        // Fallback or error gracefully handled
        console.error("Cloudinary usage fetch error:", err);
      } finally {
        setIsLoadingUsage(false);
      }
    }

    void fetchUsage();
  }, []);

  return {
    cloudinaryUsage,
    isLoadingUsage,
  };
}
