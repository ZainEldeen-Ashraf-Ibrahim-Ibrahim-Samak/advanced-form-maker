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
          logoUrl: c.logoUrl,
          metricLabel: c.metricLabel,
          metricValue: c.metricValue,
        };
      } else {
        return {
          cardType: "form" as const,
          formTemplateId: c.formTemplateId,
          sortOrder: c.sortOrder,
          visible: c.visible,
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

  const suggestIcon = async (titleAr: string, titleEn: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/admin/dashboard/cards/suggest-icon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleAr, titleEn }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? (data.data.icon as string) : null;
    } catch {
      return null;
    }
  };

  const addStatCard = async (displayNameEn: string, displayNameAr: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/dashboard/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayNameEn, displayNameAr }),
      });
      if (!res.ok) throw new Error("Failed to create stat card");
      const data = await res.json();
      if (data.success) {
        setCards(data.data.allCards);
        toast.success(t("cardCreated") || "Card created successfully");
        return true;
      }
      throw new Error(data.error);
    } catch (err) {
      toast.error(t("cardCreateFailed") || "Failed to create card");
      return false;
    }
  };

  const deleteStatCard = async (slug: string): Promise<void> => {
    const previousCards = [...cards];
    setCards((prev) => prev.filter((c) => !(c.cardType === "stat" && c.slug === slug)));
    try {
      const res = await fetch("/api/admin/dashboard/cards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) throw new Error("Failed to delete stat card");
      const data = await res.json();
      if (data.success) {
        setCards(data.data);
        toast.success(t("cardDeleted") || "Card deleted");
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setCards(previousCards);
      toast.error(t("cardDeleteFailed") || "Failed to delete card");
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
    suggestIcon,
    addStatCard,
    deleteStatCard,
  };
}
