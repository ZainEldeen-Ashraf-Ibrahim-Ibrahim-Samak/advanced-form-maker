"use client";

import { useState, useEffect, useCallback } from "react";
import type { FieldDefinition } from "@/domain/entities/field-definition";

interface UseFieldBuilderReturn {
  fields: FieldDefinition[];
  isLoading: boolean;
  error: string | null;
  createField: (data: Record<string, unknown>) => Promise<void>;
  updateField: (id: string, data: Record<string, unknown>) => Promise<void>;
  deleteField: (id: string) => Promise<void>;
  reorderFields: (fieldOrder: { fieldId: string; sortOrder: number }[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFieldBuilder(formTemplateId: string): UseFieldBuilderReturn {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    if (!formTemplateId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fields?formTemplateId=${formTemplateId}`);
      const data = await res.json();
      if (data.success) {
        setFields(data.data);
      } else {
        setError(data.error || "Failed to fetch fields");
      }
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  }, [formTemplateId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const createField = async (input: Record<string, unknown>) => {
    const res = await fetch("/api/admin/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, formTemplateId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await fetchFields();
  };

  const updateField = async (id: string, input: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/fields/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await fetchFields();
  };

  const deleteField = async (id: string) => {
    const res = await fetch(`/api/admin/fields/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await fetchFields();
  };

  const reorderFields = async (fieldOrder: { fieldId: string; sortOrder: number }[]) => {
    // Optimistic update
    const sorted = [...fields].sort((a, b) => {
      const aOrder = fieldOrder.find((f) => f.fieldId === a.id)?.sortOrder ?? a.sortOrder;
      const bOrder = fieldOrder.find((f) => f.fieldId === b.id)?.sortOrder ?? b.sortOrder;
      return aOrder - bOrder;
    });
    setFields(sorted);

    const res = await fetch("/api/admin/fields/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formTemplateId, fieldOrder }),
    });
    const data = await res.json();
    if (!data.success) {
      await fetchFields(); // Revert on failure
      throw new Error(data.error);
    }
  };

  return {
    fields,
    isLoading,
    error,
    createField,
    updateField,
    deleteField,
    reorderFields,
    refresh: fetchFields,
  };
}
