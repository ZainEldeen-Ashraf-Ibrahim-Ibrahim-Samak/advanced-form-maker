"use client";

import { useState, useEffect, createElement } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSubmissionsList } from "@/presentation/view-models/use-submissions-list";
import type { Submission } from "@/domain/entities/submission";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmissionsTable } from "@/presentation/components/admin/submissions-table";
import { ChevronLeft, ChevronRight, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { useDashboardAnalytics } from "@/presentation/view-models/use-dashboard-analytics";
import { CardManagerDialog } from "@/presentation/components/admin/card-manager-dialog";
import { getCardIcon, getCardIconColor, getCardIconBg } from "@/lib/card-icons";
import { Badge } from "@/components/ui/badge";
import { SubmissionAnalysisDialog } from "../submissions-analysis-dialog";

interface FormOption {
  id: string;
  name: string;
}

function CardHeaderIcon({ logoUrl, iconName, slug }: { logoUrl?: string | null; iconName?: string; slug?: string }) {
  const iconKey = logoUrl || iconName || null;
  const iconComponent = logoUrl ? getCardIcon(logoUrl) : iconName ? getCardIcon(iconName) : getCardIcon(null);

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
  
  // Use createElement to avoid Next.js React Compiler thinking we are defining a component during render
  return (
    <div className={`p-2 rounded-lg ${bgClass} shrink-0`}>
      {createElement(iconComponent, { className: `h-4 w-4 ${colorClass}` })}
    </div>
  );
}

export function SubmissionsManager() {
  const t = useTranslations("submissions");
  const td = useTranslations("dashboard");
  const locale = useLocale();
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
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const { cards, reorderCards, saveCards, suggestIcon, addStatCard, deleteStatCard, isLoadingCards } = useDashboardAnalytics();

  const getLiveCount = (slug: string) => {
    if (slug === "total") return counts.total;
    if (slug === "pending") return counts.pending;
    if (slug === "draft") return counts.draft;
    if (slug === "viewed") return counts.viewed;
    if (slug === "needs_rewrite") return counts.needs_rewrite;
    return 0;
  };

  const resolveMetricValue = (raw: string | null | undefined, cardSlug: string): string | number => {
    if (raw === null || raw === undefined || raw === "") return getLiveCount(cardSlug);
    const tokenMap: Record<string, number> = {
      "@total": counts.total,
      "@pending": counts.pending,
      "@draft": counts.draft,
      "@viewed": counts.viewed,
      "@needs_rewrite": counts.needs_rewrite,
    };
    if (tokenMap[raw.trim()] !== undefined) return tokenMap[raw.trim()];
    return Object.entries(tokenMap).reduce(
      (acc, [token, val]) => acc.replace(token, String(val)),
      raw
    );
  };

  const formNameById = formOptions.reduce<Record<string, string>>((acc, form) => {
    acc[form.id] = form.name;
    return acc;
  }, {});

  const contactFormLockedByFormId = cards.reduce<Record<string, boolean>>((acc, card) => {
    if (card.cardType === "form") {
      acc[card.formTemplateId] = card.contactFormLocked;
    }
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAnalysisOpen(true)}
            className="gap-2 border-indigo-200 hover:border-indigo-300 text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 dark:border-indigo-900"
          >
            <Sparkles className="h-4 w-4 text-indigo-500" />
            {t("aiAnalysis")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsCardManagerOpen(true)}>
            {td("manageCards")}
          </Button>
        </div>
      </div>

      <CardManagerDialog
        open={isCardManagerOpen}
        onOpenChange={setIsCardManagerOpen}
        cards={cards}
        onSave={saveCards}
        onSuggestIcon={suggestIcon}
        onAddStatCard={addStatCard}
        onDeleteStatCard={deleteStatCard}
        t={td}
      />

      <SubmissionAnalysisDialog
        open={isAnalysisOpen}
        onOpenChange={setIsAnalysisOpen}
        statusFilter={statusFilter}
        adminFilter={adminFilter}
        formFilter={formFilter}
      />

      {/* Unified Dynamic Cards Grid (Form Summaries + Stat Cards) */}
      {!isLoadingCards && cards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                      <CardTitle className="text-sm font-medium truncate pr-2" title={title}>{title}</CardTitle>
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
                  <Card key={card.formTemplateId} className={`hover:shadow-md transition-shadow ${card.isLocked ? "border-amber-200 dark:border-amber-800" : ""}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 truncate pr-2" title={title}>
                        <span className="truncate">{title}</span>
                        {card.isLocked && (
                          <Badge variant="destructive" className="text-[10px] shrink-0">
                            {td("lockedBadge")}
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
                          {card.metricLabel ?? td("submissionsLabel")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              }
            })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
        <div className="relative w-full sm:flex-1 sm:min-w-50 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder") || "Search submissions..."}
            className="ps-10"
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
          contactFormLockedByFormId={contactFormLockedByFormId}
          exportFormId={formFilter !== "all" ? formFilter : undefined}
          exportStatusFilter={statusFilter !== "all" ? statusFilter : undefined}
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
