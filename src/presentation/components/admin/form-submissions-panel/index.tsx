"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSubmissionsList } from "@/presentation/view-models/use-submissions-list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmissionsTable } from "@/presentation/components/admin/submissions-table";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FormSubmissionsPanelProps {
  formId: string;
  formName: string;
  onClose: () => void;
}

export function FormSubmissionsPanel({ formId, formName, onClose }: FormSubmissionsPanelProps) {
  const t = useTranslations("forms");
  const td = useTranslations("dashboard");
  const { submissions, totalPages, isLoading, fetchSubmissions, deleteSubmission } = useSubmissionsList();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  // Reset page and filter when formId changes
  useEffect(() => {
    setPage(1);
    setStatusFilter("all");
  }, [formId]);

  // Fetch submissions when page, statusFilter, or formId changes
  useEffect(() => {
    if (formId) {
      fetchSubmissions(page, statusFilter, "all", formId);
    }
  }, [page, statusFilter, formId, fetchSubmissions]);

  const handleFilterChange = (val: string | null) => {
    if (val) {
      setStatusFilter(val);
      setPage(1);
    }
  };

  return (
    <div className="border rounded-xl shadow-xs bg-card text-card-foreground overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h3 className="text-lg font-bold tracking-tight">
            {t("collaborateTitle", { name: formName })}
          </h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t("collaborateClose") || "Close"}
        </Button>
      </div>

      <div className="p-6 space-y-4">
        {/* Status Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h4 className="text-sm font-semibold text-muted-foreground font-mono uppercase tracking-wider">
            {td("filterByStatus")}
          </h4>
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={td("filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{td("allStatuses")}</SelectItem>
              <SelectItem value="pending">{td("pendingCount")}</SelectItem>
              <SelectItem value="draft">{td("draftCount")}</SelectItem>
              <SelectItem value="viewed">{td("viewedCount")}</SelectItem>
              <SelectItem value="needs_rewrite">{td("needsRewriteCount")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table Container */}
        <div>
          {submissions.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg bg-muted/10">
              <p className="text-muted-foreground text-sm font-medium">
                {t("noSubmissions")}
              </p>
            </div>
          ) : (
            <SubmissionsTable
              submissions={submissions}
              isLoading={isLoading}
              onDelete={deleteSubmission}
              onRefresh={() => fetchSubmissions(page, statusFilter, "all", formId)}
              formNamesById={{ [formId]: formName }}
              formName={formName}
            />
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
