"use client";

import { useAdminSettings, SettingsState } from "@/presentation/view-models/use-admin-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MediaSelectorDialog } from "@/presentation/components/admin/media-selector-dialog";
import { Images, X } from "lucide-react";
import Image from "next/image";

export function SettingsForm() {
  const t = useTranslations("adminSettings");
  const { settings, isLoading, isSaving, isSavingBranding, isBackingUp, saveSettings, saveBranding, triggerBackup } = useAdminSettings();
  const [localState, setLocalState] = useState<SettingsState | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteLogoUrl, setSiteLogoUrl] = useState("");
  const [siteFaviconUrl, setSiteFaviconUrl] = useState("");
  const [logoSelectorOpen, setLogoSelectorOpen] = useState(false);
  const [faviconSelectorOpen, setFaviconSelectorOpen] = useState(false);

  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(t("restoreConfirm"))) {
      e.target.value = "";
      return;
    }

    setIsRestoring(true);
    const toastId = toast.loading(t("restoringToast"));

    try {
      const formData = new FormData();
      formData.append("backup", file);

      const res = await fetch("/api/admin/system/backup", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("restoreFailed"));

      toast.success(t("restoreSuccess"), { id: toastId });
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("restoreFailed");
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
      setSiteName(settings.branding?.siteName || "ADVANCED FORM MAKER");
      setSiteLogoUrl(settings.branding?.siteLogoUrl || "");
      setSiteFaviconUrl(settings.branding?.siteFaviconUrl || "");
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
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 sm:rounded-xl shadow-sm">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 pb-2">
            {t("brandingTitle")}
          </h3>

          {/* Site Name */}
          <div className="space-y-2">
            <Label htmlFor="site_name">{t("siteNameLabel")}</Label>
            <Input
              id="site_name"
              type="text"
              maxLength={100}
              required
              placeholder="e.g. ADVANCED FORM MAKER"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>

          {/* Site Logo + Site Favicon side by side */}
          <div className="grid gap-6 sm:grid-cols-2">

            {/* Site Logo */}
            <div className="space-y-3">
              <Label>{t("siteLogoLabel")}</Label>

              {/* Preview */}
              {siteLogoUrl ? (
                <div className="relative h-24 w-full rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                  <Image
                    src={siteLogoUrl}
                    alt="Site logo"
                    fill
                    className="object-contain p-2"
                    sizes="200px"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => setSiteLogoUrl("")}
                    className="absolute top-1.5 end-1.5 rounded-full bg-background/80 p-1 shadow hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    aria-label="Remove logo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="h-24 w-full rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center text-xs text-muted-foreground">
                  No logo set
                </div>
              )}

              {/* Actions + URL input */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLogoSelectorOpen(true)}
                  disabled={isSavingBranding}
                >
                  <Images className="h-4 w-4 me-1.5" />
                  Choose from Media
                </Button>
                <Input
                  type="url"
                  placeholder="Or paste an image URL…"
                  value={siteLogoUrl}
                  onChange={(e) => setSiteLogoUrl(e.target.value)}
                  disabled={isSavingBranding}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Site Favicon */}
            <div className="space-y-3">
              <div className="space-y-0.5">
                <Label>Site Icon (Favicon)</Label>
                <p className="text-xs text-muted-foreground">Shown in the browser tab. Use a square image.</p>
              </div>

              {/* Preview */}
              {siteFaviconUrl ? (
                <div className="relative h-24 w-full rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                  <Image
                    src={siteFaviconUrl}
                    alt="Site favicon"
                    fill
                    className="object-contain p-4"
                    sizes="200px"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => setSiteFaviconUrl("")}
                    className="absolute top-1.5 end-1.5 rounded-full bg-background/80 p-1 shadow hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    aria-label="Remove favicon"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="h-24 w-full rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center text-xs text-muted-foreground">
                  No icon set (uses logo or default)
                </div>
              )}

              {/* Actions + URL input */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFaviconSelectorOpen(true)}
                  disabled={isSavingBranding}
                >
                  <Images className="h-4 w-4 me-1.5" />
                  Choose from Media
                </Button>
                <Input
                  type="url"
                  placeholder="Or paste an image URL…"
                  value={siteFaviconUrl}
                  onChange={(e) => setSiteFaviconUrl(e.target.value)}
                  disabled={isSavingBranding}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              disabled={isSavingBranding || !siteName.trim()}
              onClick={() => saveBranding({ siteName, siteLogoUrl, siteFaviconUrl })}
            >
              {isSavingBranding ? t("saving") : t("saveButton")}
            </Button>
          </div>
        </div>

        {/* Media selector dialogs — mounted only when open so state resets each session */}
        {logoSelectorOpen && (
          <MediaSelectorDialog
            open={logoSelectorOpen}
            onOpenChange={setLogoSelectorOpen}
            onSelect={(url) => setSiteLogoUrl(url)}
            currentUrl={siteLogoUrl}
            title="Choose Site Logo"
          />
        )}
        {faviconSelectorOpen && (
          <MediaSelectorDialog
            open={faviconSelectorOpen}
            onOpenChange={setFaviconSelectorOpen}
            onSelect={(url) => setSiteFaviconUrl(url)}
            currentUrl={siteFaviconUrl}
            title="Choose Site Icon (Favicon)"
          />
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto">
          <Button disabled={isSaving} onClick={() => saveSettings(localState)} className="w-full sm:w-auto">
            {isSaving ? t("saving") : t("saveButton")}
          </Button>

          <Button variant="secondary" disabled={isBackingUp} onClick={triggerBackup} className="w-full sm:w-auto">
            {isBackingUp ? t("backingUp") : t("backupNow")}
          </Button>

          <Button variant="outline" onClick={() => window.location.href = "/api/admin/system/backup"} className="w-full sm:w-auto">
            {t("downloadBackup")}
          </Button>

          <div className="relative w-full sm:w-auto">
            <Button variant="destructive" disabled={isRestoring} className="w-full">
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
          <span className="text-xs text-zinc-400 text-center md:text-right w-full md:w-auto">
            {t("lastRun", { date: new Date(settings.backup.lastRunAt).toLocaleString() })}
          </span>
        )}
      </div>
    </div>
  );
}
