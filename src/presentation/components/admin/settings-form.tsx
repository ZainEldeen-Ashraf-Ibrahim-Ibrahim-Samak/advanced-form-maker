"use client";

import { useAdminSettings, SettingsState } from "@/presentation/view-models/use-admin-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function SettingsForm() {
  const t = useTranslations("adminSettings");
  const { settings, isLoading, isSaving, isBackingUp, saveSettings, triggerBackup } = useAdminSettings();
  const [localState, setLocalState] = useState<SettingsState | null>(null);

  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("WARNING: This will completely replace the current database with the backup data. This action is destructive and cannot be undone. Are you sure?")) {
      e.target.value = "";
      return;
    }

    setIsRestoring(true);
    const toastId = toast.loading("Restoring system from backup...");

    try {
      const formData = new FormData();
      formData.append("backup", file);

      const res = await fetch("/api/admin/system/backup", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore backup");

      toast.success("System restored successfully! Reloading...", { id: toastId });
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to restore backup";
      toast.error(message, { id: toastId });
    } finally {
      setIsRestoring(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalState(settings);
    }
  }, [settings]);

  if (isLoading) return <div className="p-4 animate-pulse">{t("loading")}</div>;
  if (!localState) return <div className="p-4 text-red-500">{t("loadError")}</div>;

  const handleCronChange = (val: SettingsState["cron"]["activeInterval"]) => {
    setLocalState({
      ...localState,
      cron: { ...localState.cron, activeInterval: val }
    });
  };

  const handleDestChange = (val: SettingsState["backup"]["destination"]) => {
    setLocalState({
      ...localState,
      backup: { ...localState.backup, destination: val }
    });
  };

  const cronIntervals: SettingsState["cron"]["activeInterval"][] = [
    "none",
    "minutely",
    "hourly",
    "daily",
    "monthly",
  ];

  const backupDestinations: SettingsState["backup"]["destination"][] = ["local", "cloud", "both"];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          {t("subtitle")}
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            {t("cronTitle")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {cronIntervals.map((interval) => (
              <Button
                key={interval}
                variant={localState.cron.activeInterval === interval ? "default" : "outline"}
                onClick={() => handleCronChange(interval)}
                className="capitalize text-xs"
              >
                {interval}
              </Button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">{t("cronHint")}</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            {t("backupDestinationTitle")}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {backupDestinations.map((dest) => (
              <Button
                key={dest}
                variant={localState.backup.destination === dest ? "default" : "outline"}
                onClick={() => handleDestChange(dest)}
                className="capitalize text-xs"
              >
                {dest === "cloud" ? t("destinationCloud") : dest === "local" ? t("destinationLocal") : t("destinationBoth")}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 pb-2">
            {t("dataRetentionTitle")}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="draft_retention_days">{t("draftRetentionTitle")}</Label>
              <Input
                id="draft_retention_days"
                type="number"
                min="0"
                placeholder="0 or empty to disable"
                value={localState.draft_retention_days || ""}
                onChange={(e) =>
                  setLocalState({
                    ...localState,
                    draft_retention_days: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
              />
              <p className="text-xs text-zinc-500">{t("draftRetentionHint")}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cloudinary_storage_threshold">{t("cloudinaryThresholdTitle")}</Label>
              <Input
                id="cloudinary_storage_threshold"
                type="number"
                min="1"
                max="100"
                placeholder="e.g. 90"
                value={localState.cloudinary_storage_threshold || ""}
                onChange={(e) =>
                  setLocalState({
                    ...localState,
                    cloudinary_storage_threshold: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
              />
              <p className="text-xs text-zinc-500">{t("cloudinaryThresholdHint")}</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="storage_cleanup_target">{t("storageCleanupTitle")}</Label>
              <Select
                value={localState.storage_cleanup_target || "none"}
                onValueChange={(val) =>
                  setLocalState({
                    ...localState,
                    storage_cleanup_target: val === "none" ? null : (val as "drafts" | "unused_media"),
                  })
                }
              >
                <SelectTrigger id="storage_cleanup_target">
                  <SelectValue placeholder="Select target to clean up" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("storageCleanupTargetNone")}</SelectItem>
                  <SelectItem value="drafts">{t("storageCleanupTargetDrafts")}</SelectItem>
                  <SelectItem value="unused_media">{t("storageCleanupTargetUnused")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">
                {t("storageCleanupHint")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-4">
          <Button disabled={isSaving} onClick={() => saveSettings(localState)}>
            {isSaving ? t("saving") : t("saveButton")}
          </Button>

          <Button variant="secondary" disabled={isBackingUp} onClick={triggerBackup}>
            {isBackingUp ? t("backingUp") : t("backupNow")}
          </Button>
          
          <Button variant="outline" onClick={() => window.location.href = "/api/admin/system/backup"}>
            {t("downloadBackup")}
          </Button>

          <div className="relative">
            <Button variant="destructive" disabled={isRestoring}>
              {isRestoring ? t("restoring") : t("uploadRestore")}
            </Button>
            <input 
              title="Upload & Restore"
              type="file" 
              accept=".json,application/json"
              onChange={handleRestore}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isRestoring}
            />
          </div>
        </div>
        
        {settings?.backup.lastRunAt && (
          <span className="text-xs text-zinc-400">
            {t("lastRun", { date: new Date(settings.backup.lastRunAt).toLocaleString() })}
          </span>
        )}
      </div>
    </div>
  );
}
