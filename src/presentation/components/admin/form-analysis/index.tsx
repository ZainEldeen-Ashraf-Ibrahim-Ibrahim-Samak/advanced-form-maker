"use client";

import { useFormAnalysis } from "@/presentation/view-models/use-form-analysis";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sparkles, TrendingUp, Lightbulb, Smile, AlertCircle, Loader2, Play, CheckCircle2, Download, File, FileText, FileSpreadsheet } from "lucide-react";

function ComputedStatsCard({ analysis, t }: { analysis: any; t: any }) {
  const formatDate = (d: any) => (d ? new Date(d).toLocaleDateString() : "");
  const range = analysis.submissionDateRange;
  const dateRangeStr = range
    ? `${formatDate(range.earliest)} - ${formatDate(range.latest)}`
    : t("noDateRange") || "No submissions yet";

  // Group top answers by fieldLabel
  const groupedAnswers = (analysis.topAnswers || []).reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.fieldLabel]) acc[item.fieldLabel] = [];
    acc[item.fieldLabel].push(item);
    return acc;
  }, {});

  return (
    <Card className="flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-500" />
          {t("statsTitle") || "Submission Statistics"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between border-b pb-2">
          <span className="text-sm font-medium text-muted-foreground">{t("statsTotalLabel") || "Total Submissions"}</span>
          <span className="text-sm font-bold">{analysis.submissionCount}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-sm font-medium text-muted-foreground">{t("statsDateRangeLabel") || "Date Range"}</span>
          <span className="text-sm font-bold">{dateRangeStr}</span>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground block">{t("statsTopAnswersLabel") || "Top Answers"}</span>
          {Object.keys(groupedAnswers).length > 0 ? (
            <div className="space-y-3 ps-2">
              {Object.entries(groupedAnswers).map(([field, items]: any) => (
                <div key={field} className="space-y-1">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{field}</span>
                  <div className="grid gap-1">
                    {items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs ps-2 border-s-2 border-indigo-200">
                        <span>{item.topValue}</span>
                        <span className="text-muted-foreground">{item.count} times</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No data available</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface FormAnalysisPanelProps {
  formId: string;
}

export function FormAnalysisPanel({ formId }: FormAnalysisPanelProps) {
  const t = useTranslations("formAnalysis");
  const { analysis, isLoading, error, runAnalysis, toggleEnabled, exportAnalysis } = useFormAnalysis(formId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">{t("runningStatus")}</p>
      </div>
    );
  }

  const isEnabled = analysis?.enabled ?? true;
  const status = analysis?.analysisStatus ?? "idle";

  return (
    <div className="space-y-6">
      {/* Top Banner and Toggle Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900 border rounded-xl p-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            {t("title")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
          <Switch
            id="analysis-enabled"
            checked={isEnabled}
            onCheckedChange={toggleEnabled}
          />
          <Label htmlFor="analysis-enabled" className="text-sm font-semibold cursor-pointer select-none">
            {t("toggleEnableLabel")}
          </Label>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isEnabled ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("disabledError")}</h4>
              <p className="text-xs text-muted-foreground">{t("disabledSubtitle")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Main Action Bar */}
          <Card className="overflow-hidden border border-indigo-100 dark:border-indigo-950 bg-gradient-to-r from-indigo-50/30 to-purple-50/30 dark:from-indigo-950/10 dark:to-purple-950/10">
            <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {status === "running" ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : status === "done" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {status === "running"
                        ? t("runningStatus")
                        : status === "done"
                        ? t("doneStatus")
                        : status === "failed"
                        ? t("failedStatus")
                        : t("idleStatus")}
                    </span>
                    <Badge
                      variant={
                        status === "running"
                          ? "outline"
                          : status === "done"
                          ? "default"
                          : status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[10px] capitalize px-2 py-0.5"
                    >
                      {status}
                    </Badge>
                  </div>
                  {analysis?.analyzedAt && (
                    <p className="text-xs text-muted-foreground">
                      {t("lastAnalyzedAt", {
                        date: new Date(analysis.analyzedAt).toLocaleString(),
                        count: analysis.submissionCount,
                      })}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger nativeButton={true} render={<Button variant="outline" size="sm" className="w-full md:w-auto gap-2" />}>
                    <Download className="h-4 w-4" />
                    {t("exportButton") || "Export Analysis"}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportAnalysis("pdf")}>
                      <File className="me-2 h-4 w-4" />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportAnalysis("csv")}>
                      <FileText className="me-2 h-4 w-4" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportAnalysis("xlsx")}>
                      <FileSpreadsheet className="me-2 h-4 w-4" />
                      Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportAnalysis("json")}>
                      <Download className="me-2 h-4 w-4" />
                      JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="sm"
                  onClick={runAnalysis}
                  disabled={status === "running"}
                  className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all gap-2"
                >
                  {status === "running" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("runningStatus")}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      {t("runButton")}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Area */}
          {analysis && status !== "running" && (analysis.submissionCount > 0 || analysis.summary) && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column: Computed Stats */}
              <div className="space-y-6">
                <ComputedStatsCard analysis={analysis} t={t} />
              </div>

              {/* Right Column: AI Narrative */}
              <div className="space-y-6">
                {analysis.summary ? (
                  <div className="space-y-6">
                    {/* Executive Summary Card */}
                    <Card>
                      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base font-bold">{t("summaryTitle")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                          {analysis.summary}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Sentiment Card */}
                    <Card>
                      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <div className="p-2 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400">
                          <Smile className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base font-bold">{t("sentimentTitle")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                          {analysis.sentimentOverview}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Identified Patterns Card */}
                    <Card className="flex flex-col h-full">
                      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base font-bold">{t("patternsTitle")}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1">
                        {analysis.patterns.length > 0 ? (
                          <ul className="space-y-3">
                            {analysis.patterns.map((pattern, index) => (
                              <li key={index} className="flex gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <span className="font-semibold text-indigo-500 shrink-0 select-none">
                                  {(index + 1).toString().padStart(2, "0")}.
                                </span>
                                <span className="leading-relaxed">{pattern}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{t("noPatterns")}</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Notable Findings Card */}
                    <Card className="flex flex-col h-full">
                      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Lightbulb className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base font-bold">{t("findingsTitle")}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1">
                        {analysis.findings.length > 0 ? (
                          <ul className="space-y-3">
                            {analysis.findings.map((finding, index) => (
                              <li key={index} className="flex gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <span className="font-semibold text-amber-500 shrink-0 select-none">
                                  {(index + 1).toString().padStart(2, "0")}.
                                </span>
                                <span className="leading-relaxed">{finding}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{t("noFindings")}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="border-dashed bg-zinc-50/50 dark:bg-zinc-900/50">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                      <Sparkles className="h-10 w-10 text-indigo-400 dark:text-indigo-500 animate-pulse" />
                      <div className="space-y-1">
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("noAnalysisYet") || "No AI analysis has been run yet"}</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          {t("noAnalysisDoneDesc", { runButton: t("runButton") })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Empty State when no submissions exist */}
          {(!analysis || (analysis.submissionCount === 0 && status !== "running")) && (
            <Card className="border-dashed bg-zinc-50/50 dark:bg-zinc-900/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <Sparkles className="h-10 w-10 text-indigo-400 dark:text-indigo-500 animate-pulse" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("noAnalysisDone")}</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {t("noAnalysisDoneDesc", { runButton: t("runButton") })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
