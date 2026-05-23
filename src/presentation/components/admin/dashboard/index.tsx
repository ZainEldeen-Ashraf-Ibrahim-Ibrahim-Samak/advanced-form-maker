"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSubmissionsList } from "@/presentation/view-models/use-submissions-list";
import { useDashboardAnalytics } from "@/presentation/view-models/use-dashboard-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmissionsTable } from "@/presentation/components/admin/submissions-table";
import { FileText, Clock, Eye, AlertCircle, ChevronLeft, ChevronRight, Cloud, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardManagerDialog } from "@/presentation/components/admin/card-manager-dialog";

function CardHeaderIcon({ logoUrl, iconName, slug }: { logoUrl?: string | null; iconName?: string; slug?: string }) {
  const [imgFailed, setImgFailed] = useState(false);

  const className = `h-4 w-4 shrink-0 ${
    slug === "pending"
      ? "text-amber-500"
      : slug === "draft"
      ? "text-blue-500"
      : slug === "viewed"
      ? "text-emerald-500"
      : slug === "needs_rewrite"
      ? "text-destructive"
      : "text-muted-foreground"
  }`;

  if (logoUrl && !imgFailed) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="h-4 w-4 object-contain rounded shrink-0"
        onError={() => setImgFailed(true)}
      />
    );
  }

  if (iconName === "clock") return <Clock className={className} />;
  if (iconName === "eye") return <Eye className={className} />;
  if (iconName === "alert-circle") return <AlertCircle className={className} />;
  return <FileText className={className} />;
}

export function AdminDashboard() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { submissions, total, totalPages, counts, isLoading, fetchSubmissions, deleteSubmission } = useSubmissionsList();
  const { cloudinaryUsage, isLoadingUsage, cards, isLoadingCards, reorderCards } = useDashboardAnalytics();
  
  const formNamesById = cards.reduce<Record<string, string>>((acc, card) => {
    if (card.cardType === "form") {
      acc[card.formTemplateId] = card.displayName ?? card.name;
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Cards Config Manager Dialog Trigger */}
      {!isLoadingCards && cards.length > 0 && (
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold">{t("formSummariesTitle") || "Form Summaries"}</h3>
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            {t("manageCards") || "Manage Cards"}
          </Button>
          <CardManagerDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            cards={cards}
            onSave={reorderCards}
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
                      <CardHeaderIcon iconName={card.defaultIcon} slug={card.slug} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getLiveCount(card.slug)}</div>
                    </CardContent>
                  </Card>
                );
              } else {
                const title = locale === "ar"
                  ? (card.displayNameAr ?? card.displayNameEn ?? card.name)
                  : (card.displayNameEn ?? card.displayNameAr ?? card.name);
                return (
                  <Card key={card.formTemplateId} className={`hover:shadow-md transition-shadow ${card.isLocked ? "border-amber-200 dark:border-amber-800" : ""}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 truncate pr-2">
                        <span className="truncate">{title}</span>
                        {card.isLocked && (
                          <Badge variant="destructive" className="text-[10px] shrink-0">
                            {locale === "ar" ? "مغلق" : "Locked"}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardHeaderIcon logoUrl={card.logoUrl} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {card.metricValue !== null && card.metricValue !== undefined
                          ? card.metricValue
                          : card.submissionCount}
                      </div>
                      {(card.metricLabel || card.metricValue !== null) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {card.metricLabel ?? (locale === "ar" ? "الطلبات" : "Submissions")}
                        </p>
                      )}
                    </CardContent>
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
