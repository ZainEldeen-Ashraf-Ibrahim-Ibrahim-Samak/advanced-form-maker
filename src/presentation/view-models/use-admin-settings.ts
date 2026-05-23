import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export interface SettingsState {
  backup: {
    destination: "local" | "cloud" | "both";
    active: boolean;
    lastRunAt: string | null;
  };
  cron: {
    activeInterval: "minutely" | "hourly" | "daily" | "monthly" | "none";
    timezone: string;
  };
  draft_retention_days: number | null;
  cloudinary_storage_threshold: number | null;
  storage_cleanup_target: "drafts" | "unused_media" | null;
  branding?: {
    siteName: string;
    siteLogoUrl: string;
  };
}

export function useAdminSettings() {
  const t = useTranslations("adminSettings");
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error(t("loadSettingsError"));
      const data = await res.json();
      
      if (data.data) {
        setSettings({
          backup: data.data.backup || { destination: "local", active: true, lastRunAt: null },
          cron: data.data.cron || { activeInterval: "none", timezone: "UTC" },
          draft_retention_days: data.data.draft_retention_days ?? null,
          cloudinary_storage_threshold: data.data.cloudinary_storage_threshold ?? null,
          storage_cleanup_target: data.data.storage_cleanup_target ?? null,
          branding: data.data.branding || { siteName: "SCCT DAMAGES", siteLogoUrl: "" },
        });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("loadSettingsError");
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const saveSettings = async (newSettings: SettingsState) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });

      if (!res.ok) throw new Error(t("saveError"));
      setSettings(newSettings);
      toast.success(t("saveSuccess"));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("saveError");
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const saveBranding = async (input: { siteName?: string; siteLogoUrl?: string }) => {
    setIsSavingBranding(true);
    try {
      const res = await fetch("/api/admin/settings/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || t("brandingSaveError"));
      }
      
      const data = await res.json();
      if (data.success && settings) {
        setSettings({
          ...settings,
          branding: {
            siteName: data.data.siteName,
            siteLogoUrl: data.data.siteLogoUrl,
          },
        });
        toast.success(t("brandingSaveSuccess") || "Branding settings saved successfully");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("brandingSaveError");
      toast.error(message);
    } finally {
      setIsSavingBranding(false);
    }
  };

  const triggerBackup = async () => {
    setIsBackingUp(true);
    const toastId = toast.loading(t("backupLoading"));
    try {
      const res = await fetch("/api/admin/backups", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("backupError"));
      
      toast.success(t("backupSuccess"), { id: toastId });
      // Refresh to update lastRunAt
      await fetchSettings();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("backupError");
      toast.error(message, { id: toastId });
    } finally {
      setIsBackingUp(false);
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    isSavingBranding,
    isBackingUp,
    saveSettings,
    saveBranding,
    triggerBackup
  };
}
