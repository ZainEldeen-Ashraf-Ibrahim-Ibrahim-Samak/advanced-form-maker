"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSubmissionsList } from "@/presentation/view-models/use-submissions-list";
import { useDashboardAnalytics } from "@/presentation/view-models/use-dashboard-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmissionsTable } from "@/presentation/components/admin/submissions-table";
import { ChevronLeft, ChevronRight, Cloud, HardDrive, Copy, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardManagerDialog } from "@/presentation/components/admin/card-manager-dialog";
import { getCardIcon, getCardIconColor, getCardIconBg } from "@/lib/card-icons";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";

function CardHeaderIcon({ logoUrl, iconName, slug }: { logoUrl?: string | null; iconName?: string; slug?: string }) {
  // Determine icon component
  const iconKey = logoUrl || iconName || null;
  const Icon = logoUrl ? getCardIcon(logoUrl) : iconName ? getCardIcon(iconName) : getCardIcon(null);

  // Semantic color for default stat card slugs
  const isCustomIcon = !!logoUrl;
  const slugColor = isCustomIcon ? null : (
    slug === "pending"       ? "text-amber-500"    :
    slug === "draft"         ? "text-blue-500"     :
    slug === "viewed"        ? "text-emerald-500"  :
    slug === "needs_rewrite" ? "text-destructive"  :
    slug === "total"         ? "text-violet-500"   : null
  );

  const slugBg = isCustomIcon ? null : (
    slug === "pending"       ? "bg-amber-100 dark:bg-amber-950"    :
    slug === "draft"         ? "bg-blue-100 dark:bg-blue-950"      :
    slug === "viewed"        ? "bg-emerald-100 dark:bg-emerald-950" :
    slug === "needs_rewrite" ? "bg-red-100 dark:bg-red-950"        :
    slug === "total"         ? "bg-violet-100 dark:bg-violet-950"  : null
  );

  const colorClass = slugColor ?? getCardIconColor(iconKey, "text-muted-foreground");
  const bgClass    = slugBg    ?? getCardIconBg(iconKey, "bg-muted");

  return (
    <div className={`p-2 rounded-lg ${bgClass} shrink-0`}>
      <Icon className={`h-4 w-4 ${colorClass}`} />
    </div>
  );
}

export function AdminDashboard() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { submissions, total, totalPages, counts, isLoading, fetchSubmissions, deleteSubmission } = useSubmissionsList();
  const { cloudinaryUsage, isLoadingUsage, cards, isLoadingCards, saveCards, suggestIcon, addStatCard, deleteStatCard } = useDashboardAnalytics();
  
  const formNamesById = cards.reduce<Record<string, string>>((acc, card) => {
    if (card.cardType === "form") {
      acc[card.formTemplateId] = locale === "ar"
        ? (card.displayNameAr ?? card.displayNameEn ?? card.name)
        : (card.displayNameEn ?? card.displayNameAr ?? card.name);
    }
    return acc;
  }, {});

  const contactFormLockedByFormId = cards.reduce<Record<string, boolean>>((acc, card) => {
    if (card.cardType === "form") {
      acc[card.formTemplateId] = card.contactFormLocked;
    }
    return acc;
  }, {});

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchSubmissions(page, statusFilter);
  }, [page, statusFilter, fetchSubmissions]);

  // Sync with real-time updates
  useEffect(() => {
    const handleUpdate = () => {
      fetchSubmissions(page, statusFilter);
    };

    window.addEventListener("submissions-updated", handleUpdate);
    return () => window.removeEventListener("submissions-updated", handleUpdate);
  }, [page, statusFilter, fetchSubmissions]);

  const handleFilterChange = (val: string | null) => {
    if (val) {
      setStatusFilter(val);
      setPage(1); // Reset page on filter change
    }
  };

  const getLiveCount = (slug: string) => {
    if (slug === "total") return counts.total;
    if (slug === "pending") return counts.pending;
    if (slug === "draft") return counts.draft;
    if (slug === "viewed") return counts.viewed;
    if (slug === "needs_rewrite") return counts.needs_rewrite;
    return 0;
  };

  /**
   * Resolves a metric value string for a stat card.
   * If the raw value contains an @slug token (e.g. "@draft", "@pending"),
   * it is replaced with the live count for that status.
   * Supported tokens: @total, @pending, @draft, @viewed, @needs_rewrite
   */
  const resolveMetricValue = (raw: string | null | undefined, cardSlug: string): string | number => {
    if (raw === null || raw === undefined || raw === "") return getLiveCount(cardSlug);
    const tokenMap: Record<string, number> = {
      "@total": counts.total,
      "@pending": counts.pending,
      "@draft": counts.draft,
      "@viewed": counts.viewed,
      "@needs_rewrite": counts.needs_rewrite,
    };
    // If the whole value is a known token, return just the number
    if (tokenMap[raw.trim()] !== undefined) return tokenMap[raw.trim()];
    // Otherwise do inline replacement inside a string
    return Object.entries(tokenMap).reduce(
      (acc, [token, val]) => acc.replace(token, String(val)),
      raw
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Cards Config Manager Dialog Trigger */}
      {!isLoadingCards && cards.length > 0 && (
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold">{t("formSummariesTitle")}</h3>
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            {t("manageCards")}
          </Button>
          <CardManagerDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            cards={cards}
            onSave={saveCards}
            onSuggestIcon={suggestIcon}
            onAddStatCard={addStatCard}
            onDeleteStatCard={deleteStatCard}
            t={t}
          />
        </div>
      )}

      {/* Unified Cards Grid (Form Summaries + Stat Cards) */}
      {!isLoadingCards && cards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards
            .filter((c) => c.visible)
            .map((card) => {
              if (card.cardType === "stat") {
                const title = locale === "ar"
                  ? (card.displayNameAr ?? card.defaultLabelAr)
                  : (card.displayNameEn ?? card.defaultLabelEn);
                return (
                  <Card key={card.slug} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{title}</CardTitle>
                      <CardHeaderIcon logoUrl={card.logoUrl} iconName={card.defaultIcon} slug={card.slug} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {resolveMetricValue(card.metricValue, card.slug)}
                      </div>
                      {card.metricLabel && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {card.metricLabel}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              } else {
                const title = locale === "ar"
                  ? (card.displayNameAr ?? card.displayNameEn ?? card.name)
                  : (card.displayNameEn ?? card.displayNameAr ?? card.name);
                return (
                  <Card key={card.formTemplateId} className={`hover:shadow-md transition-shadow flex flex-col justify-between ${card.isLocked ? "border-amber-200 dark:border-amber-800" : ""}`}>
                    <div>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 truncate pr-2">
                          <span className="truncate">{title}</span>
                          {card.isLocked && (
                            <Badge variant="destructive" className="text-[10px] shrink-0">
                              {t("lockedBadge")}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardHeaderIcon logoUrl={card.logoUrl} />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-bold">
                            {card.metricValue !== null && card.metricValue !== undefined
                              ? card.metricValue
                              : card.submissionCount}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                const origin = typeof window !== "undefined" ? window.location.origin : "";
                                const url = `${origin}/${locale}/f/${card.formTemplateId}`;
                                navigator.clipboard.writeText(url);
                                toast.success(t("copyLink"));
                              }}
                              title={t("copyLink")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {(card.metricLabel || card.metricValue !== null) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {card.metricLabel ?? t("submissionsLabel")}
                          </p>
                        )}
                      </CardContent>
                    </div>

                    <div className="px-6 pb-4 pt-0">
                      <Link href={`/f/${card.formTemplateId}`} target="_blank" className="w-full">
                        <Button variant="outline" className="w-full text-xs gap-1.5 h-9" disabled={card.isLocked}>
                          <Plus className="h-3.5 w-3.5" />
                          {t("addNewForm", { name: title })}
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              }
            })}
        </div>
      )}

      {/* Cloudinary Storage Usage Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("cloudinaryStorageTitle")}</CardTitle>
            <HardDrive className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoadingUsage ? (
              <div className="text-sm text-muted-foreground animate-pulse">{t("loadingMetrics")}</div>
            ) : cloudinaryUsage ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{t("used", { amount: `${(cloudinaryUsage.storage.usage / 1024 / 1024).toFixed(2)} MB` })}</span>
                  <span className="text-muted-foreground">{t("limit", { amount: `${(cloudinaryUsage.storage.limit / 1024 / 1024 / 1024).toFixed(2)} GB` })}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${Math.min(cloudinaryUsage.storage.used_percent * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  {t("quotaUsed", { percent: (cloudinaryUsage.storage.used_percent * 100).toFixed(1) })}
                </p>
              </div>
            ) : (
              <div className="text-sm text-destructive">{t("failedToLoadStorage")}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("cloudinaryBandwidthTitle")}</CardTitle>
            <Cloud className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoadingUsage ? (
              <div className="text-sm text-muted-foreground animate-pulse">{t("loadingMetrics")}</div>
            ) : cloudinaryUsage ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{t("used", { amount: `${(cloudinaryUsage.bandwidth.usage / 1024 / 1024).toFixed(2)} MB` })}</span>
                  <span className="text-muted-foreground">{t("limit", { amount: `${(cloudinaryUsage.bandwidth.limit / 1024 / 1024 / 1024).toFixed(2)} GB` })}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${Math.min(cloudinaryUsage.bandwidth.used_percent * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  {t("quotaUsed", { percent: (cloudinaryUsage.bandwidth.used_percent * 100).toFixed(1) })}
                </p>
              </div>
            ) : (
              <div className="text-sm text-destructive">{t("failedToLoadBandwidth")}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("recentSubmissions")}</h3>
        <Select value={statusFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            <SelectItem value="pending">{t("pendingCount")}</SelectItem>
            <SelectItem value="draft">{t("draftCount")}</SelectItem>
            <SelectItem value="viewed">{t("viewedCount")}</SelectItem>
            <SelectItem value="needs_rewrite">{t("needsRewriteCount")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <SubmissionsTable
        submissions={submissions}
        isLoading={isLoading}
        onDelete={deleteSubmission}
        onRefresh={() => fetchSubmissions(page, statusFilter)}
        formNamesById={formNamesById}
        formName="all-forms"
        contactFormLockedByFormId={contactFormLockedByFormId}
        exportStatusFilter={statusFilter}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium w-12 text-center">
            {page} / {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
