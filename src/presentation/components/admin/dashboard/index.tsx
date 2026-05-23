"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSubmissionsList } from "@/presentation/view-models/use-submissions-list";
import { useDashboardAnalytics, DashboardCardWithData } from "@/presentation/view-models/use-dashboard-analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmissionsTable } from "@/presentation/components/admin/submissions-table";
import { FileText, Clock, Eye, AlertCircle, ChevronLeft, ChevronRight, Cloud, HardDrive, GripVertical, EyeOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useSensors, useSensor, PointerSensor, KeyboardSensor, DragEndEvent, DndContext, closestCenter } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableCardRow({ card, onToggleVisibility }: { card: DashboardCardWithData; onToggleVisibility: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.formTemplateId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow ${isDragging ? "shadow-md z-10" : ""} ${!card.visible ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-1"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{card.name}</span>
          {card.description && (
            <span className="text-[10px] text-muted-foreground line-clamp-1">{card.description}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onToggleVisibility(card.formTemplateId)}
        >
          {card.visible ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
        </Button>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { submissions, total, totalPages, counts, isLoading, fetchSubmissions, deleteSubmission } = useSubmissionsList();
  const { cloudinaryUsage, isLoadingUsage, cards, isLoadingCards, reorderCards, toggleCardVisibility } = useDashboardAnalytics();
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = cards.findIndex((c) => c.formTemplateId === active.id);
    const newIndex = cards.findIndex((c) => c.formTemplateId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...cards];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    void reorderCards(reordered);
  };
  
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

      {/* Dynamic Form Summary Cards */}
      {!isLoadingCards && cards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t("manageCardsTitle") || "Form Summaries"}</h3>
            <Dialog>
              <DialogTrigger nativeButton={false} render={<Button variant="outline" size="sm">{t("saveOrder") || "Configure Layout"}</Button>} />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("manageCardsTitle") || "Manage Dashboard Cards"}</DialogTitle>
                  <DialogDescription>{t("manageCardsDesc") || "Drag to reorder cards or toggle visibility."}</DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={cards.map((c) => c.formTemplateId)} strategy={verticalListSortingStrategy}>
                      {cards.map((card) => (
                        <SortableCardRow key={card.formTemplateId} card={card} onToggleVisibility={toggleCardVisibility} />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
                <DialogFooter>
                  <DialogTrigger nativeButton={false} render={<Button variant="secondary" className="w-full">{tc("close") || "Close"}</Button>} />
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards
              .filter((c) => c.visible)
              .map((card) => (
                <Card key={card.formTemplateId} className={`hover:shadow-md transition-shadow ${card.isLocked ? "border-amber-200 dark:border-amber-800" : ""}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="truncate pr-2">{card.name}</span>
                      {card.isLocked && (
                        <Badge variant="destructive" className="text-[10px] shrink-0">
                          {locale === "ar" ? "مغلق" : "Locked"}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[40px] text-xs">{card.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center pt-2">
                    <span className="text-xs text-muted-foreground">
                      {t("submissionCount", { count: card.submissionCount })}
                    </span>
                    <Link href={`/admin/forms/${card.formTemplateId}`}>
                      <Button variant="ghost" size="sm">{t("manage")}</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

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
