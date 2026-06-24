"use client";

import { useState, useEffect, useCallback } from "react";
import type { FormTemplate } from "@/domain/entities/form-template";

interface UseFormManagerReturn {
  forms: FormTemplate[];
  isLoading: boolean;
  error: string | null;
  createForm: (name: string, description?: string) => Promise<void>;
  updateForm: (id: string, data: { name?: string; description?: string; isActive?: boolean; aiAutoFillEnabled?: boolean; isLocked?: boolean; isContactForm?: boolean; canAddMoreReplies?: boolean }) => Promise<void>;
  deleteForm: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggleLock: (formId: string, currentState: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFormManager(): UseFormManagerReturn {
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/forms");
      const data = await res.json();
      if (data.success) {
        setForms(data.data);
      } else {
        setError(data.error || "Failed to fetch forms");
      }
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const createForm = async (name: string, description?: string) => {
    setError(null);
    const res = await fetch("/api/admin/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await fetchForms();
  };

  const updateForm = async (
    id: string,
    input: { name?: string; description?: string; isActive?: boolean; aiAutoFillEnabled?: boolean; isLocked?: boolean; isContactForm?: boolean; canAddMoreReplies?: boolean }
  ) => {
    setError(null);
    const res = await fetch(`/api/admin/forms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await fetchForms();
  };

  const deleteForm = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`/api/admin/forms/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      await fetchForms();
    }
    return data;
  };

  const toggleLock = async (formId: string, currentState: boolean) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/forms/${formId}/lock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: !currentState }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await fetchForms();
    } catch (e: any) {
      setError(e.message || "Failed to toggle form lock");
      throw e;
    }
  };

  return {
    forms,
    isLoading,
    error,
    createForm,
    updateForm,
    deleteForm,
    toggleLock,
    refresh: fetchForms,
  };
}
