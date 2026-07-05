"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { FieldDefinition } from "@/domain/entities/field-definition";
import type { Submission } from "@/domain/entities/submission";
import type { FieldValue } from "@/domain/entities/field-value";
import type { ContactFormField } from "@/domain/entities/form-template";
import { useDraftAutosave } from "./use-draft-autosave";
import { logger } from "@/lib/dev-logger";
import { toast } from "sonner";
import { DEFAULT_CONTACT_FORM_FIELDS, normalizeContactFormFields } from "@/lib/contact-form";

interface FormFieldData {
  fieldDefinitionId: string;
  value?: string | number | string[] | null;
  mediaUrl?: string | null;
  mediaPublicId?: string | null;
  mediaItems?: { url: string; publicId: string }[];
}

export interface ContactRecordDraft {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  mediaUrl?: string | null;
  mediaPublicId?: string | null;
}

interface DraftState {
  clientName: string;
  contactRecords: ContactRecordDraft[];
  formData: Record<string, FormFieldData>;
}

function resolveDefaultValue(field: FieldDefinition, locale: string): string | undefined {
  const def = field.defaultValue?.trim();
  if (!def) return undefined;
  if (field.inputType === "image" || field.inputType === "file" || field.inputType === "camera") {
    return undefined;
  }
  if (field.inputType === "dropdown") {
    // Defaults are stored as the English option; map to the Arabic option by index.
    const index = field.dropdownOptionsEn.indexOf(def);
    if (index === -1) return undefined;
    if (locale === "ar") return field.dropdownOptionsAr[index];
    return def;
  }
  return def;
}

interface SubmissionFieldPayload {
  fieldDefinitionId: string;
  value: string | number | string[] | null;
  mediaUrl: string | null;
  mediaPublicId: string | null;
  mediaItems: { url: string; publicId: string }[];
}

interface EventsPayload {
  type?: string;
  status?: string;
  requestStatus?: "pending_delivery" | "delivered" | "seen" | "expired";
  formId?: string;
  messageKey?: string;
  droppedFieldIds?: string[];
}

const MIN_CONTACT_RECORDS = 1;
const DEFAULT_CONTACT_NAME = "Primary Contact";

function resolveAutoContactName(name: string): string {
  const normalized = name.trim();
  return normalized.length > 0 ? normalized : DEFAULT_CONTACT_NAME;
}

function createEmptyContactRecord(): ContactRecordDraft {
  return {
    id: `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    email: "",
    phone: "",
    address: "",
  };
}

function normalizeSubmissionFieldValues(
  formData: Record<string, FormFieldData>,
  fields: FieldDefinition[],
): SubmissionFieldPayload[] {
  return fields.map((field) => {
    const raw = formData[field.id];
    const normalizedValue = Array.isArray(raw?.value)
      ? [...new Set(raw.value.map((v) => String(v).trim()).filter(Boolean))]
      : raw?.value ?? null;
    return {
      fieldDefinitionId: field.id,
      value: normalizedValue,
      mediaUrl: raw?.mediaUrl ?? null,
      mediaPublicId: raw?.mediaPublicId ?? null,
      mediaItems: Array.isArray(raw?.mediaItems) ? raw.mediaItems : [],
    };
  });
}

function isValueCompatibleWithField(value: FormFieldData["value"], field: FieldDefinition): boolean {
  if (value === undefined || value === null) return true;
  if (field.inputType === "dropdown" && field.isMultiple) return Array.isArray(value);
  if (field.inputType === "dropdown" && !field.isMultiple) return !Array.isArray(value);
  if (field.inputType === "number") return !Array.isArray(value);
  if (field.inputType === "text" || field.inputType === "date") return !Array.isArray(value);
  return true;
}

function summarizeFieldPayload(fieldValues: SubmissionFieldPayload[]) {
  return {
    total: fieldValues.length,
    withText: fieldValues.filter(
      (fv) => {
        if (Array.isArray(fv.value)) return fv.value.length > 0;
        return fv.value !== null && fv.value !== undefined && String(fv.value).trim().length > 0;
      },
    ).length,
    withMediaUrl: fieldValues.filter((fv) => !!fv.mediaUrl).length,
    withMediaItems: fieldValues.filter((fv) => fv.mediaItems.length > 0).length,
    ids: fieldValues.map((fv) => fv.fieldDefinitionId),
  };
}

function normalizeContactRecordDrafts(records: ContactRecordDraft[]) {
  const normalized = records.map((record) => ({
    ...record,
    id: record.id.trim(),
    name: record.name.trim(),
    email: record.email.trim(),
    phone: record.phone.trim(),
    address: record.address.trim(),
    mediaUrl: record.mediaUrl || null,
    mediaPublicId: record.mediaPublicId || null,
  }));

  const meaningful = normalized.filter((record) => {
    return (
      record.name.length > 0 ||
      record.email.length > 0 ||
      record.phone.length > 0 ||
      record.address.length > 0 ||
      !!record.mediaUrl
    );
  });

  let resolved = normalized.filter((record) => record.id.length > 0);

  if (resolved.length < MIN_CONTACT_RECORDS) {
    const seed = resolved[0] ?? normalized[0];
    resolved = [
      {
        id: seed?.id || createEmptyContactRecord().id,
        name: seed?.name || "",
        email: seed?.email || "",
        phone: seed?.phone || "",
        address: seed?.address || "",
        mediaUrl: seed?.mediaUrl || null,
        mediaPublicId: seed?.mediaPublicId || null,
      },
    ];
  }

  resolved = resolved.map((record) => ({
    ...record,
    name: resolveAutoContactName(record.name),
  }));

  return {
    hasMeaningfulContacts: meaningful.length > 0,
    resolvedContactRecords: resolved,
  };
}

function mapSourceContactRecords(records: unknown): ContactRecordDraft[] {
  if (!Array.isArray(records)) return [createEmptyContactRecord()];

  const normalized = records
    .map((record): ContactRecordDraft | null => {
      if (!record || typeof record !== "object") return null;
      const item = record as Record<string, unknown>;
      const id = String(item.id ?? "").trim();
      if (!id) return null;

      return {
        id,
        name: String(item.name ?? "").trim(),
        email: String(item.email ?? "").trim(),
        phone: String(item.phone ?? "").trim(),
        address: String(item.contact ?? item.address ?? "").trim(),
        mediaUrl: typeof item.mediaUrl === "string" ? item.mediaUrl : null,
        mediaPublicId: typeof item.mediaPublicId === "string" ? item.mediaPublicId : null,
      };
    })
    .filter((record): record is ContactRecordDraft => !!record);

  return normalized.length > 0 ? normalized : [createEmptyContactRecord()];
}

function hasMeaningfulDraftData(draft: DraftState | undefined): boolean {
  if (!draft) return false;

  if (draft.clientName.trim().length > 0) {
    return true;
  }

  if ((draft.contactRecords ?? []).some((record) => {
    return (
      record.name.trim().length > 0 ||
      record.email.trim().length > 0 ||
      record.phone.trim().length > 0 ||
      record.address.trim().length > 0 ||
      !!record.mediaUrl
    );
  })) {
    return true;
  }

  return Object.values(draft.formData || {}).some((field) => {
    const hasText =
      Array.isArray(field?.value)
        ? field.value.length > 0
        : field?.value !== undefined &&
          field?.value !== null &&
          String(field.value).trim().length > 0;
    const hasMedia = !!field?.mediaUrl && field.mediaUrl.trim().length > 0;
    const hasMediaItems = Array.isArray(field?.mediaItems) && field.mediaItems.length > 0;

    return hasText || hasMedia || hasMediaItems;
  });
}

interface UseSubmissionReturn {
  isNew: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  formName: string;
  formDescription: string;
  fields: FieldDefinition[];
  submission: Submission | null;
  values: FieldValue[];
  formData: Record<string, FormFieldData>;
  contactFormFields: ContactFormField[];
  contactFormLocked: boolean;
  clientName: string;
  setClientName: (name: string) => void;
  contactRecords: ContactRecordDraft[];
  updateContactRecord: (id: string, patch: Partial<Omit<ContactRecordDraft, "id">>) => void;
  setFieldValue: (id: string, value: string | number | string[] | null) => void;
  setMediaValue: (id: string, url: string, publicId: string) => void;
  setMediaItems: (id: string, items: { url: string; publicId: string }[]) => void;
  submitForm: (explicitFormData?: Record<string, FormFieldData>) => Promise<void>;
  resubmitForm: (explicitFormData?: Record<string, FormFieldData>) => Promise<void>;
  droppedFieldIds: string[];
  clearDroppedFieldWarning: () => void;
  /** True briefly after an SSE status change is received — allows the UI to animate */
  statusChangedLive: boolean;
  aiAutoFillEnabled: boolean;
  canAddMoreReplies: boolean;
  multiInstanceEnabled: boolean;
  maxInstances: number | null;
  formTemplateId: string | null;
}


export function useSubmission(tokenOrId: string): UseSubmissionReturn {
  const locale = useLocale();
  const t = useTranslations("client");
  const mountedRef = useRef(false);
  const statusFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isNew, setIsNew] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [values, setValues] = useState<FieldValue[]>([]);
  const [contactFormFields, setContactFormFields] = useState<ContactFormField[]>(DEFAULT_CONTACT_FORM_FIELDS);
  const [contactFormLocked, setContactFormLocked] = useState(false);
  const [droppedFieldIds, setDroppedFieldIds] = useState<string[]>([]);
  const [statusChangedLive, setStatusChangedLive] = useState(false);
  const [aiAutoFillEnabled, setAiAutoFillEnabled] = useState(false);
  const [canAddMoreReplies, setCanAddMoreReplies] = useState(false);
  const [multiInstanceEnabled, setMultiInstanceEnabled] = useState(false);
  const [maxInstances, setMaxInstances] = useState<number | null>(null);
  const [formTemplateId, setFormTemplateId] = useState<string | null>(null);


  const { draft, updateDraft, clearDraft, isLoaded: draftLoaded } = useDraftAutosave<DraftState>(
    `draft_${tokenOrId}`,
    { clientName: "", contactRecords: [createEmptyContactRecord()], formData: {} }
  );

  const clientName = draft?.clientName || "";
  const contactRecords =
    draft?.contactRecords && draft.contactRecords.length > 0
      ? draft.contactRecords
      : [createEmptyContactRecord()];
  const formData = draft?.formData || {};

  // Use a ref to access draft state inside fetchContent without adding it as a dependency.
  // This prevents the fetch callback from being recreated on every keystroke.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const formVersionRef = useRef<string | null>(null);

  const isEditingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (statusFlashTimeoutRef.current) {
        clearTimeout(statusFlashTimeoutRef.current);
        statusFlashTimeoutRef.current = null;
      }
    };
  }, []);

  // Track whether the user has started editing (any draft mutation after initial load)
  const setClientName = (name: string) => {
    isEditingRef.current = true;
    updateDraft(prev => ({ ...prev, clientName: name }));
  };

  const updateContactRecord = (
    id: string,
    patch: Partial<Omit<ContactRecordDraft, "id">>,
  ) => {
    isEditingRef.current = true;
    updateDraft((prev) => ({
      ...prev,
      contactRecords: (() => {
        const records = prev.contactRecords ?? [];
        let matched = false;
        const next = records.map((record) => {
          if (record.id !== id) return record;
          matched = true;
          return {
            ...record,
            name: patch.name ?? record.name,
            email: patch.email ?? record.email,
            phone: patch.phone ?? record.phone,
            address: patch.address ?? record.address,
          };
        });

        if (matched) {
          return next;
        }

        const fallback = records[0] ?? createEmptyContactRecord();
        return [
          {
            ...fallback,
            id: fallback.id || id || createEmptyContactRecord().id,
            name: patch.name ?? fallback.name,
            email: patch.email ?? fallback.email,
            phone: patch.phone ?? fallback.phone,
            address: patch.address ?? fallback.address,
          },
          ...records.slice(1),
        ];
      })(),
    }));
  };

  const setFieldValue = (id: string, value: string | number | string[] | null) => {
    isEditingRef.current = true;
    updateDraft(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [id]: { ...prev.formData[id], value, fieldDefinitionId: id },
      }
    }));
  };

  const setMediaItems = (id: string, items: { url: string; publicId: string }[]) => {
    isEditingRef.current = true;
    updateDraft(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [id]: {
          ...prev.formData[id],
          mediaItems: items,
          mediaUrl: items.length > 0 ? null : prev.formData[id]?.mediaUrl ?? null,
          mediaPublicId: items.length > 0 ? null : prev.formData[id]?.mediaPublicId ?? null,
          fieldDefinitionId: id,
        },
      }
    }));
  };

  const setMediaValue = (id: string, url: string, publicId: string) => {
    isEditingRef.current = true;
    updateDraft(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [id]: {
          ...prev.formData[id],
          mediaUrl: url,
          mediaPublicId: publicId,
          mediaItems: [],
          fieldDefinitionId: id,
        },
      }
    }));
  };

  const clearDroppedFieldWarning = () => setDroppedFieldIds([]);

  // Stable fetchContent — depends only on tokenOrId and draftLoaded.
  // Reads draft state via ref to avoid recreating the callback on every keystroke.
  const fetchContent = useCallback(async (background = false) => {
    if (!draftLoaded || !mountedRef.current) return;

    if (!background && mountedRef.current) setIsLoading(true);
    if (mountedRef.current) setError(null);
    try {
      // If we used window.history.pushState, tokenOrId might still reflect the old token
      // We must grab the actual token from the URL for the fetch if it changed
      const currentToken = window.location.pathname.split("/").pop() || tokenOrId;
      const res = await fetch(`/api/submissions/${currentToken}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) throw new Error("not_found");
        throw new Error("server_error");
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (!mountedRef.current) return;

      const data = json.data;
      setIsNew(data.isNew);
      const nextFormVersion = typeof data.formVersion === "string" ? data.formVersion : null;
      const formVersionChanged =
        !!nextFormVersion &&
        !!formVersionRef.current &&
        formVersionRef.current !== nextFormVersion;

      // Read draft via ref — no reactive dependency
      const currentDraft = draftRef.current;
      const hasDraftData = hasMeaningfulDraftData(currentDraft);

      if (data.isNew) {
        setFormName(data.formTemplate?.name || "");
        setFormDescription(data.formTemplate?.description || "");
        setFields(data.fields || []);
        setContactFormFields(normalizeContactFormFields(data.formTemplate?.contactFormFields));
        setContactFormLocked(!!data.formTemplate?.contactFormLocked);
        setAiAutoFillEnabled(!!data.formTemplate?.aiAutoFillEnabled);
        setCanAddMoreReplies(!!data.formTemplate?.canAddMoreReplies);
        setMultiInstanceEnabled(!!data.formTemplate?.multiInstanceEnabled);
        setMaxInstances(data.formTemplate?.maxInstances ?? null);
        setFormTemplateId(data.formTemplate?.id ?? null);
        formVersionRef.current = nextFormVersion;
        
        if (!hasDraftData) {
          const initialForm: Record<string, FormFieldData> = {};
          data.fields.forEach((f: FieldDefinition) => {
            const defaultValue = resolveDefaultValue(f, locale);
            initialForm[f.id] =
              defaultValue !== undefined
                ? { fieldDefinitionId: f.id, value: f.isMultiple && f.inputType === "dropdown" ? [defaultValue] : defaultValue }
                : { fieldDefinitionId: f.id };
          });
          updateDraft({
            clientName: "",
            contactRecords: mapSourceContactRecords(data.formTemplate?.contactRecords),
            formData: initialForm,
          });
        }
      } else {
        setFormName("");
        setFormDescription("");
        setSubmission(data.submission);
        setValues(data.values || []);
        setFields(data.fields || []);
        setContactFormFields(normalizeContactFormFields(data.formTemplate?.contactFormFields));
        setContactFormLocked(!!data.formTemplate?.contactFormLocked);
        setAiAutoFillEnabled(!!data.formTemplate?.aiAutoFillEnabled);
        setCanAddMoreReplies(!!data.formTemplate?.canAddMoreReplies);
        setMultiInstanceEnabled(!!data.formTemplate?.multiInstanceEnabled);
        setMaxInstances(data.formTemplate?.maxInstances ?? null);
        setFormTemplateId(data.formTemplate?.id ?? data.submission?.formTemplateId ?? null);

        // Existing submissions should reflect DB state after reload/admin updates.
        // Keep local draft only while user is actively editing and there is meaningful draft content.
        const shouldHydrateFromServer = formVersionChanged || !isEditingRef.current || !hasDraftData;
        if (shouldHydrateFromServer) {
          const nextDraftContactRecords = mapSourceContactRecords(data.submission?.contactRecords ?? []);
          const {
            hasMeaningfulContacts: hasMeaningfulLocalContacts,
            resolvedContactRecords: resolvedLocalContactRecords,
          } = normalizeContactRecordDrafts(currentDraft?.contactRecords ?? []);

          const currentDraftFormData = currentDraft?.formData ?? {};
          const dropped: string[] = [];
          const fieldIdSet = new Set(data.fields.map((field: FieldDefinition) => field.id));
          Object.keys(currentDraftFormData).forEach((key) => {
            if (!fieldIdSet.has(key)) dropped.push(key);
          });

          const reconciledFormData: Record<string, FormFieldData> = {};
          data.fields.forEach((f: FieldDefinition) => {
            const localValue = currentDraftFormData[f.id];
            if (localValue && isValueCompatibleWithField(localValue.value, f)) {
              reconciledFormData[f.id] = {
                fieldDefinitionId: f.id,
                value: localValue.value,
                mediaUrl: localValue.mediaUrl,
                mediaPublicId: localValue.mediaPublicId,
                mediaItems: localValue.mediaItems || [],
              };
              return;
            }

            if (localValue && !isValueCompatibleWithField(localValue.value, f)) {
              dropped.push(f.id);
            }

            const matchedVal = data.values?.find((v: FieldValue) => v.fieldDefinitionId === f.id);
            reconciledFormData[f.id] = {
              fieldDefinitionId: f.id,
              value: matchedVal?.value,
              mediaUrl: matchedVal?.mediaUrl,
              mediaPublicId: matchedVal?.mediaPublicId,
              mediaItems: matchedVal?.mediaItems || [],
            };
          });

          setDroppedFieldIds(dropped);
          formVersionRef.current = nextFormVersion;

          updateDraft({ 
            clientName: isEditingRef.current 
              ? (currentDraft?.clientName || data.submission?.clientName || "") 
              : (data.submission?.clientName || ""), 
            contactRecords: hasMeaningfulLocalContacts
              ? resolvedLocalContactRecords
              : (nextDraftContactRecords.length > 0
                  ? nextDraftContactRecords
                  : [createEmptyContactRecord()]),
            formData: reconciledFormData,
          });
        } else {
          logger.debug("Preserving in-progress local draft over server payload", {
            tokenOrId: currentToken,
          });
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "error");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tokenOrId, draftLoaded, updateDraft]);

  useEffect(() => {
    fetchContent();

    // Listen for real-time status updates via SSE
    if (!tokenOrId) return;

    let reconnectTimeout: NodeJS.Timeout;
    let eventSource: EventSource | null = null;

    function connect() {
      if (eventSource) eventSource.close();
      
      eventSource = new EventSource(`/api/submissions/${tokenOrId}/events`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as EventsPayload;
          if (!mountedRef.current) return;

          if (data.type === "STATUS_CHANGED") {
            const newStatus = data.status;
            if (newStatus === "viewed") {
              toast.info(t("toastSubmissionViewed"));
            } else if (newStatus === "needs_rewrite") {
              toast.warning(t("toastSubmissionNeedsRevision"));
            }
            if (data.requestStatus === "pending_delivery" || data.requestStatus === "delivered") {
              toast.warning(t("toastResubmissionRequested"));
            }

            setStatusChangedLive(true);
            if (statusFlashTimeoutRef.current) {
              clearTimeout(statusFlashTimeoutRef.current);
            }
            statusFlashTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                setStatusChangedLive(false);
              }
            }, 2000);
            fetchContent(true);
          }

          if (data.type === "CONTACT_FORM_UPDATED") {
            toast.info(t("toastContactFormUpdated"));
            fetchContent(true);
          }
        } catch {
          // silent fail for heartbeat/ping
        }
      };

      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
        reconnectTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (statusFlashTimeoutRef.current) {
        clearTimeout(statusFlashTimeoutRef.current);
        statusFlashTimeoutRef.current = null;
      }
      if (eventSource) eventSource.close();
    };
  }, [fetchContent, tokenOrId]);

  const submitForm = async (explicitFormData?: Record<string, FormFieldData>) => {
    setIsSubmitting(true);
    setError(null);
    
    // Safety check for empty submissions
    const currentDraft = draftRef.current;
    
    // Prefer explicitly passed reactive formData to resolve boundary scope bypasses during hydration
    const resolvedFormData = explicitFormData || currentDraft.formData;
    const fieldValues = normalizeSubmissionFieldValues(resolvedFormData, fields);
    const fieldSummary = summarizeFieldPayload(fieldValues);
    const { hasMeaningfulContacts, resolvedContactRecords } = normalizeContactRecordDrafts(
      currentDraft.contactRecords ?? [],
    );
    const resolvedClientName = currentDraft.clientName.trim() || resolvedContactRecords[0]?.name || DEFAULT_CONTACT_NAME;

    if (
      !currentDraft.clientName.trim() &&
      !hasMeaningfulContacts &&
      fieldSummary.withText === 0 &&
      fieldSummary.withMediaUrl === 0 &&
      fieldSummary.withMediaItems === 0
    ) {
      logger.warn("Submit attempt with empty draft", { tokenOrId, fieldSummary });
      setError("Please fill out the form before submitting.");
      setIsSubmitting(false);
      return;
    }

    try {
      const currentToken = window.location.pathname.split("/").pop() || tokenOrId;
      const endpoint = `/api/submissions/${currentToken}`;
      const payload = {
        clientName: resolvedClientName,
        clientContact: "",
        contactRecords: resolvedContactRecords.map((record) => ({
          id: record.id,
          name: record.name,
          email: record.email,
          phone: record.phone,
          contact: record.address,
          role: "",
          notes: "",
          mediaUrl: record.mediaUrl ?? null,
          mediaPublicId: record.mediaPublicId ?? null,
        })),
        fieldValues,
      };

      logger.info("Submitting form payload prepared", {
        endpoint,
        tokenOrId: currentToken,
        clientNameLength: resolvedClientName.length,
        clientContactLength: 0,
        fieldSummary,
      });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      logger.info("Submission API response received", {
        endpoint,
        ok: res.ok,
        status: res.status,
        success: !!json?.success,
        hasAccessToken: !!json?.data?.accessToken,
      });
      if (!json.success) throw new Error(json.error || "Failed to submit");
      clearDraft();
      isEditingRef.current = false;
      // Client-side navigation via history API prevents full component remount
      const newUrl = `/${locale}/submit/${json.data.accessToken}`;
      window.history.pushState(null, "", newUrl);
      // Silently refresh data to get 'isViewOnly=true' without flashing skeletons
      await fetchContent(true);
      toast.success(t("toastSubmitSaved"));
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Submission failed");
        toast.error(err instanceof Error ? err.message : t("error"));
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const resubmitForm = async (explicitFormData?: Record<string, FormFieldData>) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const currentDraft = draftRef.current;
      const resolvedFormData = explicitFormData || currentDraft.formData;
      const fieldValues = normalizeSubmissionFieldValues(resolvedFormData, fields);
      const fieldSummary = summarizeFieldPayload(fieldValues);
      const { resolvedContactRecords } = normalizeContactRecordDrafts(currentDraft.contactRecords ?? []);
      const resolvedClientName = currentDraft.clientName.trim() || resolvedContactRecords[0]?.name || DEFAULT_CONTACT_NAME;
      const currentToken = window.location.pathname.split("/").pop() || tokenOrId;
      const endpoint = `/api/submissions/${currentToken}`;
      
      const payload = {
        clientName: resolvedClientName,
        clientContact: "",
        contactRecords: resolvedContactRecords.map((record) => ({
          id: record.id,
          name: record.name,
          email: record.email,
          phone: record.phone,
          contact: record.address,
          role: "",
          notes: "",
          mediaUrl: record.mediaUrl ?? null,
          mediaPublicId: record.mediaPublicId ?? null,
        })),
        fieldValues,
      };

      logger.info("Resubmitting form payload prepared", {
        endpoint,
        tokenOrId: currentToken,
        clientNameLength: resolvedClientName.length,
        clientContactLength: 0,
        fieldSummary,
      });

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      logger.info("Resubmission API response received", {
        endpoint,
        ok: res.ok,
        status: res.status,
        success: !!json?.success,
      });
      if (!json.success) throw new Error(json.error || "Failed to resubmit");
      clearDraft();
      isEditingRef.current = false;
      // Silently refresh data without flashing skeletons
      await fetchContent(true);
      toast.success(t("toastResubmitSaved"));
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Resubmission failed");
        toast.error(err instanceof Error ? err.message : t("error"));
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  return {
    isNew,
    isLoading,
    isSubmitting,
    error,
    formName,
    formDescription,
    fields,
    submission,
    values,
    formData,
    contactFormFields,
    contactFormLocked,
    clientName,
    setClientName,
    contactRecords,
    updateContactRecord,
    setFieldValue,
    setMediaValue,
    setMediaItems,
    submitForm,
    resubmitForm,
    droppedFieldIds,
    clearDroppedFieldWarning,
    statusChangedLive,
    aiAutoFillEnabled,
    canAddMoreReplies,
    multiInstanceEnabled,
    maxInstances,
    formTemplateId,
  };
}
