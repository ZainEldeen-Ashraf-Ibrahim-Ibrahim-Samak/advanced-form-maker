import { useState, useEffect, useCallback, useRef } from "react";
import { FormAnalysis } from "@/domain/entities/form-analysis";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";

export function useFormAnalysis(formId: string) {
  const t = useTranslations("formAnalysis");
  const locale = useLocale();
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnalysis = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/forms/${formId}/analysis`);
      if (!res.ok) {
        throw new Error("Failed to fetch form analysis");
      }
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.data);
        return data.data as FormAnalysis;
      }
      return null;
    } catch (err: any) {
      setError(err.message || "Failed to load analysis");
      return null;
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [formId]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    pollTimerRef.current = setInterval(async () => {
      const current = await fetchAnalysis(true);
      if (current) {
        if (current.analysisStatus === "done") {
          toast.success(t("doneStatus"));
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        } else if (current.analysisStatus === "failed") {
          toast.error(`${t("failedStatus")}${current.errorMessage ? `: ${current.errorMessage}` : ""}`);
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      }
    }, 3000);
  }, [fetchAnalysis, t]);

  const runAnalysis = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/forms/${formId}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to run analysis");
      }

      toast.info(t("runningStatus"));
      
      setAnalysis((prev) => {
        if (!prev) {
          return {
            id: "",
            formTemplateId: formId,
            enabled: true,
            summary: null,
            patterns: [],
            findings: [],
            sentimentOverview: null,
            analyzedAt: null,
            submissionCount: 0,
            topAnswers: null,
            submissionDateRange: null,
            analysisStatus: "running",
            errorMessage: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        return {
          ...prev,
          analysisStatus: "running",
          errorMessage: null,
        };
      });

      startPolling();
    } catch (err: any) {
      toast.error(err.message || "Failed to start analysis");
      setError(err.message || "Failed to start analysis");
    }
  };

  const toggleEnabled = async (enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/forms/${formId}/analysis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      if (data.success) {
        setAnalysis(data.data);
        toast.success(t("doneStatus") || "Status updated successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update state");
    }
  };

  const exportAnalysis = async (format: "pdf" | "csv" | "xlsx" | "json") => {
    try {
      window.location.href = `/api/admin/forms/${formId}/analysis/export?format=${format}`;
    } catch (err: any) {
      toast.error(err.message || "Failed to export analysis");
    }
  };

  useEffect(() => {
    void fetchAnalysis().then((currentAnalysis) => {
      if (currentAnalysis?.analysisStatus === "running") {
        startPolling();
      }
    });
  }, [fetchAnalysis, startPolling]);

  return {
    analysis,
    isLoading,
    error,
    runAnalysis,
    toggleEnabled,
    exportAnalysis,
    refreshAnalysis: fetchAnalysis,
  };
}
