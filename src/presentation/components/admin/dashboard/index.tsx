"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSubmissionsList } from "@/presentation/view-models/use-submissions-list";
import { useDashboardAnalytics } from "@/presentation/view-models/use-dashboard-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmissionsTable } from "@/presentation/components/admin/submissions-table";
import {
  ChevronLeft, ChevronRight, Copy, Plus,
  Clock, FilePen, Eye, AlertCircle, BarChart3, FileText, type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CardManagerDialog } from "@/presentation/components/admin/card-manager-dialog";
import { CARD_ICON_MAP, getCardIconColor, getCardIconBg } from "@/lib/card-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";

/* ── Stat card vivid color system ── */
interface StatCardStyle {
  bg: string;
  number: string;
  label: string;
  sublabel: string;
  iconBg: string;
  iconColor: string;
}

const STAT_STYLES: Record<string, StatCardStyle> = {
  pending: {
    bg: "bg-amber-400 dark:bg-amber-500",
    number: "text-amber-950 dark:text-white",
    label: "text-amber-900/80 dark:text-amber-50/90",
    sublabel: "text-amber-800/60 dark:text-amber-100/60",
    iconBg: "bg-amber-300/50 dark:bg-amber-400/30",
    iconColor: "text-amber-700 dark:text-amber-100",
  },
  draft: {
    bg: "bg-sky-500 dark:bg-sky-600",
    number: "text-white",
    label: "text-sky-50/90",
    sublabel: "text-sky-100/65",
    iconBg: "bg-sky-400/40",
    iconColor: "text-sky-100",
  },
  viewed: {
    bg: "bg-emerald-500 dark:bg-emerald-600",
    number: "text-white",
    label: "text-emerald-50/90",
    sublabel: "text-emerald-100/65",
    iconBg: "bg-emerald-400/40",
    iconColor: "text-emerald-100",
  },
  needs_rewrite: {
    bg: "bg-rose-500 dark:bg-rose-600",
    number: "text-white",
    label: "text-rose-50/90",
    sublabel: "text-rose-100/65",
    iconBg: "bg-rose-400/40",
    iconColor: "text-rose-100",
  },
  total: {
    bg: "bg-violet-600 dark:bg-violet-700",
    number: "text-white",
    label: "text-violet-50/90",
    sublabel: "text-violet-100/65",
    iconBg: "bg-violet-500/40",
    iconColor: "text-violet-100",
  },
};

const SLUG_ICONS: Record<string, LucideIcon> = {
  pending: Clock,
  draft: FilePen,
  viewed: Eye,
  needs_rewrite: AlertCircle,
  total: BarChart3,
};

function FormCardHeaderIcon({
  logoUrl,
  iconName,
}: {
  logoUrl?: string | null;
  iconName?: string;
}) {
  const iconKey = logoUrl || iconName || null;
  const Icon = (iconKey ? CARD_ICON_MAP[iconKey] : null) || FileText;
  const colorClass = getCardIconColor(iconKey, "text-muted-foreground");
  const bgClass = getCardIconBg(iconKey, "bg-muted");

  return (
    <div className={cn("p-2 rounded-lg shrink-0", bgClass)}>
      <Icon className={cn("h-4 w-4", colorClass)} />
    </div>
  );
}

export function AdminDashboard() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { submissions, total, totalPages, counts, isLoading, fetchSubmissions, deleteSubmission } =
    useSubmissionsList();
  const {
    cards, isLoadingCards,
    saveCards, suggestIcon, addStatCard, deleteStatCard,
  } = useDashboardAnalytics();

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

  useEffect(() => {
    const handleUpdate = () => fetchSubmissions(page, statusFilter);
    window.addEventListener("submissions-updated", handleUpdate);
    return () => window.removeEventListener("submissions-updated", handleUpdate);
  }, [page, statusFilter, fetchSubmissions]);

  const handleFilterChange = (val: string | null) => {
    if (val) {
      setStatusFilter(val);
      setPage(1);
    }
  };

  const totalFormsActive = cards.filter((c) => c.cardType === "form" && c.isActive).length;

  const getLiveCount = (slug: string) => {
    if (slug === "total") return counts.total;
    if (slug === "pending") return counts.pending;
    if (slug === "draft") return counts.draft;
    if (slug === "viewed") return counts.viewed;
    if (slug === "needs_rewrite") return counts.needs_rewrite;
    return 0;
  };

  const resolveMetricValue = (raw: string | null | undefined, cardSlug: string, fallback?: number): string | number => {
    if (raw === null || raw === undefined || raw === "") return fallback ?? getLiveCount(cardSlug);
    const tokenMap: Record<string, number> = {
      "@total": counts.total,
      "@pending": counts.pending,
      "@draft": counts.draft,
      "@viewed": counts.viewed,
      "@needs_rewrite": counts.needs_rewrite,
      "@total_forms_active": totalFormsActive,
    };
    if (tokenMap[raw.trim()] !== undefined) return tokenMap[raw.trim()];
    return Object.entries(tokenMap).reduce(
      (acc, [token, val]) => acc.replace(token, String(val)),
      raw,
    );
  };

  // Some cards were saved with a raw metric-token as their name (e.g. "total_forms_active")
  // instead of a real label. Detect that and show a translated label instead of the raw token.
  const TOKEN_LABEL_KEYS: Record<string, string> = {
    total: "statLabelTotal",
    pending: "statLabelPending",
    draft: "statLabelDraft",
    viewed: "statLabelViewed",
    needs_rewrite: "statLabelNeedsRewrite",
    total_forms_active: "statLabelTotalFormsActive",
  };

  const resolveStatTitle = (rawName: string | null | undefined, fallback: string): string => {
    if (!rawName) return fallback;
    const normalized = rawName.trim().replace(/^@/, "").replace(/^\d+_/, "").toLowerCase();
    const key = TOKEN_LABEL_KEYS[normalized];
    return key ? t(key) : rawName;
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Cards loading skeletons */}
      {isLoadingCards && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* First-run empty state */}
      {!isLoadingCards && cards.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 px-6 text-center">
          <div className="p-3 rounded-full bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold">{t("emptyTitle")}</h3>
          <p className="text-sm text-muted-foreground max-w-md">{t("emptyDesc")}</p>
          <Link href="/admin/forms">
            <Button className="mt-2 gap-2">
              <Plus className="h-4 w-4" />
              {t("emptyCta")}
            </Button>
          </Link>
        </div>
      )}

      {/* Cards section header */}
      {!isLoadingCards && cards.length > 0 && (
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{t("formSummariesTitle")}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="text-xs"
          >
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

      {/* Unified card grid */}
      {!isLoadingCards && cards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards
            .filter((c) => c.visible)
            .map((card) => {
              if (card.cardType === "stat") {
                const title =
                  locale === "ar"
                    ? resolveStatTitle(card.displayNameAr, card.defaultLabelAr)
                    : resolveStatTitle(card.displayNameEn, card.defaultLabelEn);

                const styles = STAT_STYLES[card.slug] ?? {
                  bg: "bg-primary",
                  number: "text-primary-foreground",
                  label: "text-primary-foreground/80",
                  sublabel: "text-primary-foreground/60",
                  iconBg: "bg-white/20",
                  iconColor: "text-primary-foreground",
                };

                const StatIcon = SLUG_ICONS[card.slug] ?? BarChart3;

                return (
                  <div
                    key={card.slug}
                    className={cn(
                      "rounded-xl p-5 flex flex-col gap-4 transition-all duration-200",
                      "hover:scale-[1.02] hover:shadow-lg cursor-default",
                      styles.bg,
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn("text-sm font-medium leading-snug", styles.label)}>
                        {title}
                      </span>
                      <div className={cn("p-2 rounded-lg shrink-0", styles.iconBg)}>
                        <StatIcon className={cn("h-4 w-4", styles.iconColor)} />
                      </div>
                    </div>

                    <div>
                      <div className={cn("text-4xl font-bold tabular-nums tracking-tight", styles.number)}>
                        {resolveMetricValue(card.metricValue, card.slug)}
                      </div>
                      {card.metricLabel && (
                        <p className={cn("text-xs mt-1.5", styles.sublabel)}>
                          {card.metricLabel}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              /* Form summary card */
              const title =
                locale === "ar"
                  ? (card.displayNameAr ?? card.displayNameEn ?? card.name)
                  : (card.displayNameEn ?? card.displayNameAr ?? card.name);

              const buttonLabel =
                locale === "ar"
                  ? (card.buttonLabelAr ?? card.buttonLabelEn)
                  : (card.buttonLabelEn ?? card.buttonLabelAr);

              return (
                <Card
                  key={card.formTemplateId}
                  className={cn(
                    "flex flex-col justify-between pt-0 hover:shadow-md transition-shadow",
                    card.isLocked && "ring-1 ring-amber-300 dark:ring-amber-700",
                  )}
                >
                  <div>
                    {/* Tinted header strip */}
                    <div className="bg-primary/6 dark:bg-primary/10 px-4 pt-4 pb-3 rounded-t-[calc(var(--radius)-1px)] flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate">{title}</span>
                        {card.isLocked && (
                          <Badge variant="destructive" className="text-[10px] shrink-0">
                            {t("lockedBadge")}
                          </Badge>
                        )}
                      </div>
                      <FormCardHeaderIcon logoUrl={card.logoUrl} />
                    </div>

                    <CardContent className="pt-4">
                      <div className="flex items-end justify-between">
                        <div className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
                          {resolveMetricValue(card.metricValue, "", card.submissionCount)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground mb-0.5"
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
                      {(card.metricLabel || card.metricValue !== null) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {card.metricLabel ?? t("submissionsLabel")}
                        </p>
                      )}
                    </CardContent>
                  </div>

                  <div className="px-4 pb-4 pt-0">
                    <Link href={`/f/${card.formTemplateId}`} target="_blank" className="w-full">
                      <Button
                        variant="outline"
                        className="w-full text-xs gap-1.5 h-9"
                        disabled={card.isLocked}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {buttonLabel ?? t("addNewForm", { name: title })}
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
        </div>
      )}

      {/* Recent submissions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{t("recentSubmissions")}</h3>
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
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
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium tabular-nums w-14 text-center">
              {page} / {totalPages}
            </span>
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
