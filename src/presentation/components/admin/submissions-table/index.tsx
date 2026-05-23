"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Eye, MoreHorizontal, Trash2, Loader2, Download, FileText, FileSpreadsheet, File, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, buildSubmissionUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import type { Submission } from "@/domain/entities/submission";
import { exportToCSV, exportToExcel, exportToPDF, exportToJSON } from "@/lib/export";

interface SubmissionsTableProps {
  submissions: Submission[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
  formNamesById?: Record<string, string>;
  formName?: string;
}

export function SubmissionsTable({ submissions, isLoading, onDelete, onRefresh, formNamesById = {}, formName }: SubmissionsTableProps) {
  const t = useTranslations("submissions");
  const tc = useTranslations("common");
  const router = useRouter();

  const normalizeContactValue = (value?: string | null) => {
    const normalized = (value ?? "").trim();
    return normalized.length > 0 ? normalized : null;
  };

  const getContactSummary = (submission: Submission) => {
    const fromContactRecords = submission.contactRecords.find((record) => {
      return (
        normalizeContactValue(record.email) ||
        normalizeContactValue(record.phone) ||
        normalizeContactValue(record.contact)
      );
    });

    if (fromContactRecords) {
      return {
        email: normalizeContactValue(fromContactRecords.email),
        phone: normalizeContactValue(fromContactRecords.phone),
        address: normalizeContactValue(fromContactRecords.contact),
      };
    }

    const fromLegacyContact = normalizeContactValue(submission.clientContact);

    return {
      email: null,
      phone: fromLegacyContact,
      address: null,
    };
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingMany, setIsDeletingMany] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.length === submissions.length && submissions.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(submissions.map(s => s.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sId => sId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = buildSubmissionUrl(token);
    navigator.clipboard.writeText(url);
    toast.success(t("linkCopied"));
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSelectedClick = () => {
    if (selectedIds.length === 0) return;
    setDeleteTargetId("MANY");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      if (deleteTargetId === "MANY") {
        setIsDeletingMany(true);
        await Promise.all(selectedIds.map(id => onDelete(id)));
        toast.success(t("submissionsDeleted") || tc("deleted"));
        setSelectedIds([]);
      } else {
        await onDelete(deleteTargetId);
        toast.success(t("submissionDeleted"));
      }
      onRefresh();
    } catch {
      toast.error(tc("error"));
    } finally {
      setIsDeletingMany(false);
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  const getExportColumns = () => [
    {
      header: t("indexHeader") || "#",
      key: (_: Submission, idx: number) => idx + 1,
    },
    {
      header: t("formName"),
      key: (row: Submission) => formNamesById[row.formTemplateId] || "—",
    },
    { header: t("clientName"), key: "clientName" as const },
    { 
      header: t("contactEmail"), 
      key: (row: Submission) => {
        const contact = getContactSummary(row);
        return contact.email || "—";
      }
    },
    { 
      header: t("contactPhone"), 
      key: (row: Submission) => {
        const contact = getContactSummary(row);
        return contact.phone || "—";
      }
    },
    { 
      header: t("contactAddress"), 
      key: (row: Submission) => {
        const contact = getContactSummary(row);
        return contact.address || "—";
      }
    },
    { header: tc("status"), key: (row: Submission) => t(`statuses.${row.status}`) },
    { header: t("submittedAt"), key: (row: Submission) => formatDate(row.submittedAt) },
  ];
 
  const handleExport = async (format: "csv" | "excel" | "pdf" | "json", data: Submission[], filenamePrefix: string) => {
    const filename = filenamePrefix === "all-submissions" ? `${formName || "submissions"} data` : filenamePrefix;
    const columns = getExportColumns();
    
    try {
      if (format === "csv") {
        exportToCSV(data, filename, columns);
      } else if (format === "excel") {
        exportToExcel(data, filename, columns);
      } else if (format === "pdf") {
        await exportToPDF(data, filename, t("exportTitle") || "Submissions Export", columns);
      } else if (format === "json") {
        exportToJSON(data, filename, columns);
      }
      toast.success(tc("exportedSuccess") || "Exported successfully");
    } catch (err) {
      toast.error(tc("exportFailed") || tc("error"));
    }
  };

  if (isLoading && submissions.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox disabled className="opacity-50" />
              </TableHead>
              <TableHead className="w-12 text-center">
                <Skeleton className="h-4 w-4 mx-auto rounded" />
              </TableHead>
              <TableHead className="whitespace-nowrap"><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead className="hidden md:table-cell whitespace-nowrap"><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead className="hidden md:table-cell whitespace-nowrap"><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead className="hidden lg:table-cell whitespace-nowrap"><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead className="hidden xl:table-cell whitespace-nowrap"><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead className="whitespace-nowrap"><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead className="hidden sm:table-cell whitespace-nowrap"><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead className="text-end whitespace-nowrap"><Skeleton className="h-4 w-8 inline-block" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Checkbox disabled className="opacity-50" />
                  </TableCell>
                  <TableCell className="w-12 text-center">
                    <Skeleton className="h-4 w-4 mx-auto rounded" />
                  </TableCell>
                  <TableCell className="w-full sm:w-auto">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20 mt-2 md:hidden" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-end"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                </TableRow>
             ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md bg-muted/20">
        <p className="text-muted-foreground">{t("noSubmissionsFound")}</p>
      </div>
    );
  }

    const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="text-muted-foreground border-dashed">{t("statuses.draft")}</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">{t("statuses.pending")}</Badge>;
      case "viewed":
        return <Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">{t("statuses.viewed")}</Badge>;
      case "needs_rewrite":
        return <Badge variant="destructive">{t("statuses.needs_rewrite")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getLatestUpdater = (sub: Submission) => {
    if (sub.auditTrail && sub.auditTrail.length > 0) {
      // Find the most recent audit entry where newStatus matches current status
      const updatedEntries = [...sub.auditTrail].reverse().find(entry => entry.newStatus === sub.status);
      if (updatedEntries) {
        return updatedEntries.adminName;
      }
    }
    return null;
  };

  return (
    <>
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/20 border border-b-0 rounded-t-md">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {selectedIds.length} {t("selected", { count: selectedIds.length }) || tc("selected")}
          </span>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger nativeButton={true} render={<Button variant="outline" size="sm" />}>
                <Download className="me-2 h-4 w-4" />
                {tc("exportSelected")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv", submissions.filter(s => selectedIds.includes(s.id)), "selected-submissions")}>
                  <FileText className="me-2 h-4 w-4" />
                  {tc("exportCSV")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel", submissions.filter(s => selectedIds.includes(s.id)), "selected-submissions")}>
                  <FileSpreadsheet className="me-2 h-4 w-4" />
                  {tc("exportExcel")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf", submissions.filter(s => selectedIds.includes(s.id)), "selected-submissions")}>
                  <File className="me-2 h-4 w-4" />
                  {tc("exportPDF")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteSelectedClick}
              disabled={isDeletingMany}
            >
              {isDeletingMany ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="me-2 h-4 w-4" />
              )}
              {tc("deleteSelected")}
            </Button>
          </div>
        </div>
      )}
      <div className={`flex items-center justify-end gap-2 mb-4 ${selectedIds.length > 0 ? "hidden" : ""}`}>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleExport("pdf", submissions, "all-submissions")}
          disabled={submissions.length === 0}
          title={submissions.length === 0 ? t("noSubmissionsToExport") || "No submissions to export" : ""}
        >
          <File className="me-2 h-4 w-4" />
          {tc("exportPDF") || "PDF"}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleExport("csv", submissions, "all-submissions")}
          disabled={submissions.length === 0}
          title={submissions.length === 0 ? t("noSubmissionsToExport") || "No submissions to export" : ""}
        >
          <FileText className="me-2 h-4 w-4" />
          {tc("exportCSV") || "CSV"}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleExport("excel", submissions, "all-submissions")}
          disabled={submissions.length === 0}
          title={submissions.length === 0 ? t("noSubmissionsToExport") || "No submissions to export" : ""}
        >
          <FileSpreadsheet className="me-2 h-4 w-4" />
          {tc("exportExcel") || "Excel"}
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleExport("json", submissions, "all-submissions")}
          disabled={submissions.length === 0}
          title={submissions.length === 0 ? t("noSubmissionsToExport") || "No submissions to export" : ""}
        >
          <Download className="me-2 h-4 w-4" />
          {tc("exportJSON") || "JSON"}
        </Button>
      </div>
      <div className={`rounded-md border ${selectedIds.length > 0 ? "rounded-t-none border-t-0" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedIds.length === submissions.length && submissions.length > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-12 text-center">{t("indexHeader") || "#"}</TableHead>
              <TableHead className="whitespace-nowrap">{t("clientName")}</TableHead>
              <TableHead className="hidden md:table-cell whitespace-nowrap">{t("formName")}</TableHead>
              <TableHead className="hidden md:table-cell whitespace-nowrap">{t("contactEmail")}</TableHead>
              <TableHead className="hidden lg:table-cell whitespace-nowrap">{t("contactPhone")}</TableHead>
              <TableHead className="hidden xl:table-cell whitespace-nowrap">{t("contactAddress")}</TableHead>
              <TableHead className="whitespace-nowrap">{tc("status")}</TableHead>
              <TableHead className="hidden sm:table-cell whitespace-nowrap">{t("submittedAt")}</TableHead>
              <TableHead className="text-end whitespace-nowrap">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((sub, idx) => {
              const latestUpdater = getLatestUpdater(sub);
              const contactSummary = getContactSummary(sub);
              const isSelected = selectedIds.includes(sub.id);
              const formName = formNamesById[sub.formTemplateId] || "—";
              return (
                <TableRow 
                  key={sub.id} 
                  className={`cursor-pointer group ${isSelected ? "bg-muted/50" : ""}`}
                  onClick={() => router.push(`/admin/submissions/${sub.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectRow(sub.id)}
                      aria-label={`Select ${sub.clientName || 'submission'}`}
                    />
                  </TableCell>
                  <TableCell className="w-12 text-center text-muted-foreground font-medium">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium group-hover:text-primary transition-colors wrap-break-word">
                    <div>{sub.clientName || `${formatDate(sub.submittedAt)} - ${t("unnamedSubmission")} ${idx + 1}`}</div>
                    <div className="mt-1 text-xs text-muted-foreground font-normal md:hidden">
                      {t("formName")}: {formName}
                    </div>
                    {(contactSummary.phone || contactSummary.email) && (
                      <div className="mt-1 text-xs text-muted-foreground font-normal break-all flex items-center gap-2">
                        <span>{[contactSummary.phone, contactSummary.email].filter(Boolean).join(" • ")}</span>
                        {contactSummary.phone && (
                          <div className="flex items-center gap-1.5 ml-1">
                            <a 
                              href={`tel:${contactSummary.phone}`} 
                              title={t("contactPhone")}
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                              <Phone className="h-3 w-3" />
                            </a>
                            <a 
                              href={`https://wa.me/${contactSummary.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              title={tc("whatsapp")}
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                              <MessageCircle className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell break-all">{formName}</TableCell>
                  <TableCell className="hidden md:table-cell break-all">{contactSummary.email || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell break-all">{contactSummary.phone || "—"}</TableCell>
                  <TableCell className="hidden xl:table-cell break-all">{contactSummary.address || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      {getStatusBadge(sub.status)}
                      {latestUpdater && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-muted/60 px-1.5 py-0.5 rounded">
                           {t("updatedBy", { name: latestUpdater })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm whitespace-nowrap">
                    <span title={formatDate(sub.submittedAt)}>{formatDate(sub.submittedAt)}</span>
                    {sub.lastResubmittedAt && (
                      <span className="block text-xs text-amber-600/80 mt-0.5">
                        {t("resubmittedAt", { date: formatDate(sub.lastResubmittedAt) })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger nativeButton={true} render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                        <span className="sr-only">{t("openMenu")}</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/submissions/${sub.id}`)}>
                          <Eye className="me-2 h-4 w-4" />
                          {t("viewDetail")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyLink(sub.accessToken)}>
                          <Copy className="me-2 h-4 w-4" />
                          {t("copyLink")}
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Download className="me-2 h-4 w-4" />
                            {tc("export")}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent alignOffset={-5}>
                              <DropdownMenuItem onClick={() => handleExport("csv", [sub], `submission-${sub.id}`)}>
                                <FileText className="me-2 h-4 w-4" />
                                {tc("exportCSV")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport("excel", [sub], `submission-${sub.id}`)}>
                                <FileSpreadsheet className="me-2 h-4 w-4" />
                                {tc("exportExcel")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport("pdf", [sub], `submission-${sub.id}`)}>
                                <File className="me-2 h-4 w-4" />
                                {tc("exportPDF")}
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(sub.id)}>
                          <Trash2 className="me-2 h-4 w-4" />
                          {t("deleteSubmission")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog — rendered outside the DropdownMenu tree to avoid
          the dropdown's close lifecycle interfering with the dialog's open state */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>{tc("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
