import { useState, useEffect, useCallback } from "react";
import { StorageUsageMetrics } from "@/domain/repositories/storage-repository";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { UnifiedCardItem, UnifiedCardUpdateInput } from "@/domain/use-cases/admin/manage-dashboard-cards";

export type DashboardCardWithData = UnifiedCardItem;

const getCardId = (c: UnifiedCardItem) => c.cardType === "stat" ? c.slug : c.formTemplateId;

export function useDashboardAnalytics() {
  const t = useTranslations("dashboard");
  const [cloudinaryUsage, setCloudinaryUsage] = useState<StorageUsageMetrics | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [cards, setCards] = useState<UnifiedCardItem[]>([]);
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

  const mapToPayload = (list: UnifiedCardItem[]): UnifiedCardUpdateInput[] => {
    return list.map((c) => {
      if (c.cardType === "stat") {
        return {
          cardType: "stat" as const,
          slug: c.slug,
          sortOrder: c.sortOrder,
          visible: c.visible,
          displayNameAr: c.displayNameAr,
          displayNameEn: c.displayNameEn,
        };
      } else {
        return {
          cardType: "form" as const,
          formTemplateId: c.formTemplateId,
          sortOrder: c.sortOrder,
          visible: c.visible,
          displayName: c.displayName,
          displayNameAr: c.displayNameAr,
          displayNameEn: c.displayNameEn,
          logoUrl: c.logoUrl,
          metricLabel: c.metricLabel,
          metricValue: c.metricValue,
        };
      }
    });
  };

  const reorderCards = async (newOrder: UnifiedCardItem[]) => {
    const previousCards = [...cards];
    // Map with new sequential sort orders
    const updatedWithOrder = newOrder.map((c, idx) => ({ ...c, sortOrder: idx }));
    setCards(updatedWithOrder);

    try {
      const payload = mapToPayload(updatedWithOrder);

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

  const toggleCardVisibility = async (cardId: string) => {
    const previousCards = [...cards];
    const updated = cards.map((c) => {
      if (getCardId(c) === cardId) {
        return { ...c, visible: !c.visible };
      }
      return c;
    });
    setCards(updated);

    try {
      const payload = mapToPayload(updated);

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
