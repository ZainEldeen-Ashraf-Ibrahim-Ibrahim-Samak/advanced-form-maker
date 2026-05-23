import { useState, useEffect, useCallback } from "react";
import { StorageUsageMetrics } from "@/domain/repositories/storage-repository";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export interface DashboardCardWithData {
  formTemplateId: string;
  name: string;
  description: string;
  visible: boolean;
  sortOrder: number;
  submissionCount: number;
  isLocked: boolean;
}

export function useDashboardAnalytics() {
  const t = useTranslations("dashboard");
  const [cloudinaryUsage, setCloudinaryUsage] = useState<StorageUsageMetrics | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [cards, setCards] = useState<DashboardCardWithData[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  const fetchCards = useCallback(async () => {
    setIsLoadingCards(true);
    try {
      const res = await fetch("/api/admin/dashboard/cards");
      if (!res.ok) throw new Error("Failed to load cards config");
      const data = await res.json();
      if (data.success) {
        setCards(data.data);
      }
    } catch (err) {
      console.error("Dashboard cards fetch error:", err);
    } finally {
      setIsLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch("/api/admin/analytics/cloudinary-usage");
        if (!res.ok) throw new Error("Failed to load usage metrics");
        const data = await res.json();
        setCloudinaryUsage(data);
      } catch (err) {
        console.error("Cloudinary usage fetch error:", err);
      } finally {
        setIsLoadingUsage(false);
      }
    }

    void fetchUsage();
    void fetchCards();
  }, [fetchCards]);

  const reorderCards = async (newOrder: DashboardCardWithData[]) => {
    const previousCards = [...cards];
    // Map with new sequential sort orders
    const updatedWithOrder = newOrder.map((c, idx) => ({ ...c, sortOrder: idx }));
    setCards(updatedWithOrder);

    try {
      const payload = updatedWithOrder.map((c) => ({
        formTemplateId: c.formTemplateId,
        sortOrder: c.sortOrder,
        visible: c.visible,
      }));

      const res = await fetch("/api/admin/dashboard/cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save layout");
      const data = await res.json();
      if (data.success) {
        setCards(data.data);
        toast.success(t("layoutSaved") || "Dashboard layout saved successfully");
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setCards(previousCards);
      toast.error("Failed to save layout");
    }
  };

  const toggleCardVisibility = async (formId: string) => {
    const previousCards = [...cards];
    const updated = cards.map((c) => {
      if (c.formTemplateId === formId) {
        return { ...c, visible: !c.visible };
      }
      return c;
    });
    setCards(updated);

    try {
      const payload = updated.map((c) => ({
        formTemplateId: c.formTemplateId,
        sortOrder: c.sortOrder,
        visible: c.visible,
      }));

      const res = await fetch("/api/admin/dashboard/cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save layout");
      const data = await res.json();
      if (data.success) {
        setCards(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setCards(previousCards);
      toast.error("Failed to update visibility");
    }
  };

  return {
    cloudinaryUsage,
    isLoadingUsage,
    cards,
    isLoadingCards,
    reorderCards,
    toggleCardVisibility,
    refreshCards: fetchCards,
  };
}
