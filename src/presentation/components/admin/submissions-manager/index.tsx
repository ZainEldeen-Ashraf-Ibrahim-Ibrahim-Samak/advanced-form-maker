"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSubmissionsList } from "@/presentation/view-models/use-submissions-list";
import type { Submission } from "@/domain/entities/submission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmissionsTable } from "@/presentation/components/admin/submissions-table";
import { FileText, Clock, Eye, AlertCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { useDashboardAnalytics } from "@/presentation/view-models/use-dashboard-analytics";
import { CardManagerDialog } from "@/presentation/components/admin/card-manager-dialog";

interface FormOption {
  id: string;
  name: string;
}

export function SubmissionsManager() {
  const t = useTranslations("submissions");
  const td = useTranslations("dashboard");
  const searchParams = useSearchParams();
  const expandId = searchParams.get("expand");

  const { submissions, totalPages, counts, isLoading, fetchSubmissions, deleteSubmission } = useSubmissionsList();
  
  const [statusFilter, setStatusFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");
  const [formFilter, setFormFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [uniqueAdmins, setUniqueAdmins] = useState<string[]>([]);
  const [formOptions, setFormOptions] = useState<FormOption[]>([]);
  const [isCardManagerOpen, setIsCardManagerOpen] = useState(false);
  const { cards, reorderCards, suggestIcon, addStatCard, deleteStatCard } = useDashboardAnalytics();

  const formNameById = formOptions.reduce<Record<string, string>>((acc, form) => {
    acc[form.id] = form.name;
    return acc;
  }, {});

  useEffect(() => {
    // In a real app, search might be a separate API param. 
    // For now we use the existing fetchSubmissions which might only filter by status.
    fetchSubmissions(page, statusFilter, adminFilter, formFilter);
  }, [page, statusFilter, adminFilter, formFilter, fetchSubmissions]);

  // Sync with real-time updates
  useEffect(() => {
    fetch("/api/admin/submissions/admins")
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setUniqueAdmins(json.data);
        }
      })
      .catch((err) => console.error("Failed to load admins list", err));

    fetch("/api/admin/forms", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setFormOptions(
            json.data
              .map((form: { id?: string; name?: string }) => ({
                id: String(form.id ?? "").trim(),
                name: String(form.name ?? "").trim(),
              }))
              .filter((form: FormOption) => form.id.length > 0 && form.name.length > 0),
          );
        }
      })
      .catch((err) => console.error("Failed to load forms list", err));

    const handleUpdate = () => {
      fetchSubmissions(page, statusFilter, adminFilter, formFilter);
    };

    window.addEventListener("submissions-updated", handleUpdate);
    return () => window.removeEventListener("submissions-updated", handleUpdate);
  }, [page, statusFilter, adminFilter, formFilter, fetchSubmissions]);

  const handleFilterChange = (val: string | null) => {
    if (val) {
      setStatusFilter(val);
      setPage(1);
    }
  };

  const handleAdminFilterChange = (val: string | null) => {
    if (val) {
      setAdminFilter(val);
      setPage(1);
    }
  };

  const handleFormFilterChange = (val: string | null) => {
    if (val) {
      setFormFilter(val);
      setPage(1);
    }
  };

  const getSearchableContact = (sub: Submission) => {
    const fromContactRecords = sub.contactRecords
      .map((record) => [record.phone, record.email, record.contact])
      .flat()
      .map((value) => (value ?? "").trim())
      .find((contact) => contact.length > 0);

    if (fromContactRecords) {
      return fromContactRecords;
    }

    return (sub.clientContact ?? "").trim();
  };

  const filteredSubmissions = submissions.filter(sub => {
    const searchableContact = getSearchableContact(sub);
    return search 
      ? (
          sub.clientName?.toLowerCase().includes(search.toLowerCase()) ||
          searchableContact.toLowerCase().includes(search.toLowerCase())
        )
      : true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsCardManagerOpen(true)}>
          {td("manageCards") || "Manage Cards"}
        </Button>
      </div>

      <CardManagerDialog
        open={isCardManagerOpen}
        onOpenChange={setIsCardManagerOpen}
        cards={cards}
        onSave={reorderCards}
        onSuggestIcon={suggestIcon}
        onAddStatCard={addStatCard}
        onDeleteStatCard={deleteStatCard}
        t={td}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{td("totalSubmissions")}</CardTitle>
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950 shrink-0">
              <FileText className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{td("pendingCount")}</CardTitle>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 shrink-0">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{td("draftCount")}</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 shrink-0">
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{td("viewedCount")}</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 shrink-0">
              <Eye className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.viewed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{td("needsRewriteCount")}</CardTitle>
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950 shrink-0">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.needs_rewrite}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
        <div className="relative w-full sm:flex-1 sm:min-w-50 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t("searchPlaceholder") || "Search submissions..."} 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium whitespace-nowrap">{t("filterByForm") || "Form"}:</span>
            <Select value={formFilter} onValueChange={handleFormFilterChange}>
              <SelectTrigger className="w-full sm:w-45">
                <SelectValue placeholder={t("allForms") || "All Forms"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allForms") || "All Forms"}</SelectItem>
                {formOptions.map((form) => (
                  <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium whitespace-nowrap">{t("filterByAdmin") || "Admin"}:</span>
            <Select value={adminFilter} onValueChange={handleAdminFilterChange}>
              <SelectTrigger className="w-full sm:w-37.5">
                <SelectValue placeholder={t("allAdmins") || "All Admins"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allAdmins") || "All Admins"}</SelectItem>
                {uniqueAdmins.map((admin) => (
                  <SelectItem key={admin} value={admin}>{admin}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium whitespace-nowrap">{td("filterByStatus")}:</span>
            <Select value={statusFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-full sm:w-37.5">
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
        </div>
      </div>

      <div className={expandId ? "ring-2 ring-primary ring-offset-4 rounded-lg" : ""}>
        <SubmissionsTable 
          submissions={filteredSubmissions} 
          isLoading={isLoading} 
          onDelete={deleteSubmission}
          onRefresh={() => fetchSubmissions(page, statusFilter, adminFilter, formFilter)}
          formNamesById={formNameById}
          formName={formFilter !== "all" ? formNameById[formFilter] : undefined}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4 me-2" />
            {t("previous") || "Previous"}
          </Button>
          <div className="text-sm font-medium px-4">
            {page} / {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {t("next") || "Next"}
            <ChevronRight className="h-4 w-4 ms-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
