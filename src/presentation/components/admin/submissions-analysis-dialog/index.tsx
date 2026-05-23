"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Lightbulb, Smile, AlertCircle, Loader2, FileText, Download, File, FileSpreadsheet, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface SubmissionAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusFilter: string;
  adminFilter: string;
  formFilter: string;
}

interface AnalysisData {
  summary: string;
  patterns: string[];
  findings: string[];
  sentimentOverview: string;
  submissionCount: number;
}

export function SubmissionAnalysisDialog({
  open,
  onOpenChange,
  statusFilter,
  adminFilter,
  formFilter,
}: SubmissionAnalysisDialogProps) {
  const t = useTranslations("submissions");
  const ta = useTranslations("formAnalysis");
  const locale = useLocale();

  const exportAnalysis = (format: "pdf" | "csv" | "xlsx" | "json") => {
    window.location.href = `/api/admin/submissions/analysis/export?format=${format}&status=${statusFilter}&admin=${adminFilter}&formId=${formFilter}&locale=${locale}`;
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalysisData | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(
        `/api/admin/submissions/analysis?status=${statusFilter}&admin=${adminFilter}&formId=${formFilter}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || t("noSubmissionsForAnalysis"));
      }
    } catch (err) {
      setError(ta("failedStatus") || "Failed to generate analysis");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, adminFilter, formFilter, locale, t, ta]);

  useEffect(() => {
    if (!open) return;
    fetchAnalysis();
  }, [open, fetchAnalysis]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {t("aiAnalysis")}
              </DialogTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalysis}
              disabled={loading}
              className="gap-2 shrink-0 border-indigo-200 hover:border-indigo-300 text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 dark:border-indigo-900"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("tryAgain")}
            </Button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {t("aiAnalysisDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">
                {t("analyzing")}
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm w-full">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-6">
              {/* Header stats badge and export dropdown */}
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    {ta("statsTitle") || "Statistics"}
                  </span>
                  <Badge variant="secondary" className="text-xs px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200">
                    {t("analyzedCount", { count: data.submissionCount })}
                  </Badge>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger nativeButton={true} render={<Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-medium" />}>
                    <Download className="h-3.5 w-3.5" />
                    {ta("exportButton") || "Export Analysis"}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportAnalysis("pdf")}>
                      <File className="me-2 h-4 w-4 text-rose-500" />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportAnalysis("csv")}>
                      <FileText className="me-2 h-4 w-4 text-blue-500" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportAnalysis("xlsx")}>
                      <FileSpreadsheet className="me-2 h-4 w-4 text-emerald-500" />
                      Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportAnalysis("json")}>
                      <Download className="me-2 h-4 w-4 text-amber-500" />
                      JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Dynamic Tabs */}
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid grid-cols-4 w-full bg-muted/60 p-1 rounded-lg">
                  <TabsTrigger value="summary" className="text-xs py-1.5 font-medium transition-all">
                    {ta("summaryTitle") || "Summary"}
                  </TabsTrigger>
                  <TabsTrigger value="patterns" className="text-xs py-1.5 font-medium transition-all">
                    {ta("patternsTitle") || "Patterns"}
                  </TabsTrigger>
                  <TabsTrigger value="findings" className="text-xs py-1.5 font-medium transition-all">
                    {ta("findingsTitle") || "Findings"}
                  </TabsTrigger>
                  <TabsTrigger value="sentiment" className="text-xs py-1.5 font-medium transition-all">
                    {ta("sentimentTitle") || "Sentiment"}
                  </TabsTrigger>
                </TabsList>

                {/* Summary content */}
                <TabsContent value="summary" className="mt-4 focus-visible:outline-none">
                  <Card className="border border-indigo-100 dark:border-indigo-950 bg-indigo-50/10 dark:bg-indigo-950/5">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <FileText className="h-5 w-5" />
                        <h4 className="font-bold text-sm">{ta("summaryTitle") || "Executive Summary"}</h4>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                        {data.summary}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Patterns content */}
                <TabsContent value="patterns" className="mt-4 focus-visible:outline-none">
                  <Card className="border border-indigo-100 dark:border-indigo-950 bg-indigo-50/10 dark:bg-indigo-950/5">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <TrendingUp className="h-5 w-5" />
                        <h4 className="font-bold text-sm">{ta("patternsTitle") || "Identified Patterns"}</h4>
                      </div>
                      {data.patterns.length > 0 ? (
                        <ul className="space-y-3">
                          {data.patterns.map((pattern, index) => (
                            <li key={index} className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                              <span className="font-bold text-indigo-500 shrink-0 select-none">
                                {(index + 1).toString().padStart(2, "0")}.
                              </span>
                              <span className="leading-relaxed">{pattern}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">{ta("noPatterns") || "No patterns identified."}</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Findings content */}
                <TabsContent value="findings" className="mt-4 focus-visible:outline-none">
                  <Card className="border border-indigo-100 dark:border-indigo-950 bg-indigo-50/10 dark:bg-indigo-950/5">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <Lightbulb className="h-5 w-5" />
                        <h4 className="font-bold text-sm">{ta("findingsTitle") || "Notable Findings"}</h4>
                      </div>
                      {data.findings.length > 0 ? (
                        <ul className="space-y-3">
                          {data.findings.map((finding, index) => (
                            <li key={index} className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                              <span className="font-bold text-indigo-500 shrink-0 select-none">
                                {(index + 1).toString().padStart(2, "0")}.
                              </span>
                              <span className="leading-relaxed">{finding}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">{ta("noFindings") || "No notable findings detected."}</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sentiment content */}
                <TabsContent value="sentiment" className="mt-4 focus-visible:outline-none">
                  <Card className="border border-indigo-100 dark:border-indigo-950 bg-indigo-50/10 dark:bg-indigo-950/5">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <Smile className="h-5 w-5" />
                        <h4 className="font-bold text-sm">{ta("sentimentTitle") || "Sentiment & Tone Overview"}</h4>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                        {data.sentimentOverview}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
