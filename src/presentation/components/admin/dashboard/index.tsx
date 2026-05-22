"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSubmissionsList } from "@/presentation/view-models/use-submissions-list";
import { useDashboardAnalytics } from "@/presentation/view-models/use-dashboard-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmissionsTable } from "@/presentation/components/admin/submissions-table";
import { FileText, Clock, Eye, AlertCircle, ChevronLeft, ChevronRight, Cloud, HardDrive } from "lucide-react";

export function AdminDashboard() {
  const t = useTranslations("dashboard");
  const { submissions, total, totalPages, counts, isLoading, fetchSubmissions, deleteSubmission } = useSubmissionsList();
  const { cloudinaryUsage, isLoadingUsage } = useDashboardAnalytics();
  
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalSubmissions")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("pendingCount")}</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("draftCount")}</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("viewedCount")}</CardTitle>
            <Eye className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.viewed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("needsRewriteCount")}</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.needs_rewrite}</div>
          </CardContent>
        </Card>
      </div>

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
