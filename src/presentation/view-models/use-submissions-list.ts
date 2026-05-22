"use client";

import { useState, useCallback } from "react";
import type { Submission } from "@/domain/entities/submission";
import { logger } from "@/lib/dev-logger";

interface UseSubmissionsListReturn {
  submissions: Submission[];
  total: number;
  totalPages: number;
  counts: { pending: number; draft: number; viewed: number; needs_rewrite: number; total: number };
  isLoading: boolean;
  error: string | null;
  fetchSubmissions: (page: number, status: string, admin?: string, formId?: string) => Promise<void>;
  updateStatus: (id: string, status: string, comment?: string) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
}

export function useSubmissionsList(): UseSubmissionsListReturn {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ pending: 0, draft: 0, viewed: 0, needs_rewrite: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = async () => {
    try {
      logger.debug("Fetching admin submission counts");
      const res = await fetch("/api/admin/submissions/counts", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setCounts(json.data);
        logger.debug("Admin submission counts fetched", json.data);
      }
    } catch {
      // Background count fetch failure is non-fatal
      logger.warn("Failed to fetch admin submission counts");
    }
  };

  const fetchSubmissions = useCallback(async (page: number, status: string, admin?: string, formId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/admin/submissions?page=${page}&status=${encodeURIComponent(status)}`;
      if (admin && admin !== "all") {
        url += `&admin=${encodeURIComponent(admin)}`;
      }
      if (formId && formId !== "all") {
        url += `&formId=${encodeURIComponent(formId)}`;
      }
      logger.info("Fetching admin submissions", { page, status, admin, formId });
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      setSubmissions(json.data.submissions);
      setTotal(json.data.total);
      setTotalPages(json.data.totalPages);
      logger.info("Admin submissions fetched", {
        page,
        status,
        admin,
        formId,
        total: json.data.total,
        pageSize: json.data.submissions.length,
      });

      fetchCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submissions");
      logger.error("Failed to fetch admin submissions", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStatus = async (id: string, status: string, comment?: string) => {
    logger.info("Updating admin submission status", { id, status });
    const res = await fetch(`/api/admin/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, comment }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    logger.info("Admin submission status updated", { id, status });
    await fetchCounts(); // Update counts locally since status changed
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("submissions-updated"));
    }
  };

  const deleteSubmission = async (id: string) => {
    logger.info("Deleting admin submission", { id });
    const res = await fetch(`/api/admin/submissions/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    logger.info("Admin submission deleted", { id });
  };

  return {
    submissions,
    total,
    totalPages,
    counts,
    isLoading,
    error,
    fetchSubmissions,
    updateStatus,
    deleteSubmission,
  };
}
