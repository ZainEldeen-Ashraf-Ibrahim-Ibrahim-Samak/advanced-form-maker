"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSubmission } from "@/presentation/view-models/use-submission";
import { FieldRenderer } from "./field-renderer";
import { ContactRecords } from "./contact-records";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Loader2, Send, PlusCircle, Plus, X, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EMAIL_REGEX, PHONE_REGEX, NAME_REGEX, TEXT_REGEX } from "@/constants/constants";
import { useAiExtraction } from "@/presentation/view-models/use-ai-extraction";
import { AiPhotoUpload } from "./ai-photo-upload";
import { AiExtractionSummary } from "./ai-extraction-summary";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useRef } from "react";
import { toast } from "sonner";
import { ExtractionResult } from "@/domain/entities/ai-extraction";

interface SubmissionFormProps {
  tokenOrId: string;
}

export function SubmissionForm({ tokenOrId }: SubmissionFormProps) {
  const t = useTranslations("client");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const locale = useLocale() as "en" | "ar";
  const tAi = useTranslations("aiExtraction");

  const {
    isNew,
    isLoading,
    isSubmitting,
    error,
    formName,
    formDescription,
    fields,
    submission,
    formData,
    contactFormFields,
    contactFormLocked,
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
  } = useSubmission(tokenOrId);

  const currentFieldValues = useMemo(() => {
    const res: Record<string, string | number | null> = {};
    fields.forEach((f) => {
      const fd = formData[f.id];
      if (fd) {
        if (Array.isArray(fd.value)) {
          res[f.id] = fd.value as any;
        } else {
          res[f.id] = fd.value ?? null;
        }
      } else {
        res[f.id] = null;
      }
    });
    return res;
  }, [fields, formData]);

  const currentContactValues = useMemo(() => {
    const primary = contactRecords[0] || {};
    return {
      name: primary.name || "",
      email: primary.email || "",
      phone: primary.phone || "",
      address: primary.address || "",
    };
  }, [contactRecords]);

  const handleApplyMultipleRecords = (extractedRecords: ExtractionResult[]) => {
    let recordsToUse = extractedRecords;
    const limit = maxInstances || 50;
    
    if (recordsToUse.length > limit) {
      recordsToUse = recordsToUse.slice(0, limit);
      toast.warning(tAi("multiInstanceTruncated", { total: extractedRecords.length, max: limit }));
    }

    const nextInstances: FormInstance[] = recordsToUse.map((rec, idx) => {
      const instForm: Record<string, any> = {};
      fields.forEach((f) => {
        const ext = rec.fieldValues?.[f.id];
        instForm[f.id] = {
          fieldDefinitionId: f.id,
          value: ext?.value !== undefined ? ext.value : null,
        };
      });

      const name = rec.contactData?.name || "";
      const email = rec.contactData?.email || "";
      const phone = rec.contactData?.phone || "";
      const address = rec.contactData?.address || "";

      return {
        id: `instance_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        formData: instForm,
        contactRecords: [
          {
            id: `cr_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
            name: name || "Primary Contact",
            email,
            phone,
            address,
          }
        ],
        validationErrors: {},
      };
    });

    if (nextInstances.length > 0) {
      setInstances(nextInstances);
      toast.success(tAi("extractionSuccess") || "Form auto-filled successfully!");
    }
  };

  const {
    isExtracting,
    stage: aiStage,
    elapsedSeconds: aiElapsedSeconds,
    error: aiError,
    warning: aiWarning,
    autoFilledFieldIds,
    autoFilledKeys,
    showOverwriteConfirm,
    retryCount: aiRetryCount,
    handleExtractFromPhoto,
    retryExtraction,
    confirmOverwrite,
    clearAutoFillIndicator,
    clearAutoFillContactIndicator,
    resetState: resetAiState,
  } = useAiExtraction({
    fieldDefinitions: fields,
    contactFormFields: contactFormLocked ? [] : contactFormFields,
    currentFieldValues,
    currentContactValues,
    onApplyField: (fieldId, val) => {
      setFieldValue(fieldId, val);
    },
    onApplyContact: (key, val) => {
      const primary = contactRecords[0] || { id: "fallback_contact_record" };
      updateContactRecord(primary.id, { [key]: val });
    },
    locale,
    multiInstanceEnabled,
    maxInstances,
    onApplyMultipleRecords: handleApplyMultipleRecords,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [submittingAll, setSubmittingAll] = useState(false);

  interface FormInstance {
    id: string;
    formData: Record<string, { value?: any; mediaUrl?: string | null; mediaPublicId?: string | null; mediaItems?: { url: string; publicId: string }[] }>;
    contactRecords: any[];
    validationErrors: Record<string, boolean>;
  }

  const [instances, setInstances] = useState<FormInstance[]>([]);
  const [isSubmitAllSuccess, setIsSubmitAllSuccess] = useState(false);
  const [submitAllError, setSubmitAllError] = useState<string | null>(null);

  const hasInitializedInstances = useRef(false);
  if (!isLoading && !hasInitializedInstances.current) {
    if (multiInstanceEnabled) {
      setInstances([
        {
          id: "instance_default",
          formData: { ...formData },
          contactRecords: [...contactRecords],
          validationErrors: {},
        }
      ]);
      hasInitializedInstances.current = true;
    }
  }

  const updateInstanceContactRecord = (instanceId: string, contactId: string, patch: any) => {
    setInstances(prev => prev.map(inst => {
      if (inst.id !== instanceId) return inst;
      const nextContacts = inst.contactRecords.map(cr => {
        if (cr.id !== contactId) return cr;
        return { ...cr, ...patch };
      });
      return { ...inst, contactRecords: nextContacts, validationErrors: { ...inst.validationErrors, contactRecords: false } };
    }));
  };

  const updateInstanceFieldValue = (instanceId: string, fieldId: string, val: any) => {
    setInstances(prev => prev.map(inst => {
      if (inst.id !== instanceId) return inst;
      const nextFormData = {
        ...inst.formData,
        [fieldId]: {
          ...(inst.formData[fieldId] || { fieldDefinitionId: fieldId }),
          value: val
        }
      };
      const nextErrors = { ...inst.validationErrors };
      delete nextErrors[fieldId];
      return { ...inst, formData: nextFormData, validationErrors: nextErrors };
    }));
  };

  const updateInstanceMediaValue = (instanceId: string, fieldId: string, url: string, publicId: string) => {
    setInstances(prev => prev.map(inst => {
      if (inst.id !== instanceId) return inst;
      const nextFormData = {
        ...inst.formData,
        [fieldId]: {
          ...(inst.formData[fieldId] || { fieldDefinitionId: fieldId }),
          mediaUrl: url,
          mediaPublicId: publicId
        }
      };
      const nextErrors = { ...inst.validationErrors };
      delete nextErrors[fieldId];
      return { ...inst, formData: nextFormData, validationErrors: nextErrors };
    }));
  };

  const updateInstanceMediaItems = (instanceId: string, fieldId: string, items: any[]) => {
    setInstances(prev => prev.map(inst => {
      if (inst.id !== instanceId) return inst;
      const nextFormData = {
        ...inst.formData,
        [fieldId]: {
          ...(inst.formData[fieldId] || { fieldDefinitionId: fieldId }),
          mediaItems: items
        }
      };
      const nextErrors = { ...inst.validationErrors };
      delete nextErrors[fieldId];
      return { ...inst, formData: nextFormData, validationErrors: nextErrors };
    }));
  };

  const handleAddInstance = () => {
    if (maxInstances && instances.length >= maxInstances) return;
    if (instances.length >= 50) return;

    const initialForm: Record<string, any> = {};
    fields.forEach((f) => {
      initialForm[f.id] = { fieldDefinitionId: f.id };
    });

    const newInstance: FormInstance = {
      id: `instance_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      formData: initialForm,
      contactRecords: [
        {
          id: `cr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: "Primary Contact",
          email: "",
          phone: "",
          contact: "",
          role: "",
          notes: "",
        }
      ],
      validationErrors: {},
    };

    setInstances(prev => [...prev, newInstance]);
  };

  const handleRemoveInstance = (instanceId: string) => {
    if (instances.length <= 1) return;
    setInstances(prev => prev.filter(inst => inst.id !== instanceId));
  };

  const validateInstance = (inst: FormInstance) => {
    const errors: Record<string, boolean> = {};
    let isValid = true;

    if (!contactFormLocked) {
      if (inst.contactRecords.length < 1) {
        errors.contactRecords = true;
        isValid = false;
      } else {
        const primary = inst.contactRecords[0] || {};
        const hasMissingRequiredContactField = contactFormFields.some((field) => {
          if (!field.required) return false;

          const value =
            field.key === "name"
              ? primary.name
              : field.key === "email"
                ? primary.email
                : field.key === "phone"
                  ? primary.phone
                  : primary.contact;

          const isMissing = String(value ?? "").trim().length === 0;
          if (isMissing) {
            errors[`contact_${field.key}`] = true;
          }
          return isMissing;
        });

        if (hasMissingRequiredContactField) {
          errors.contactRecords = true;
          isValid = false;
        } else {
          const getField = (key: string) => contactFormFields.find(f => f.key === key);
          if (getField("email")?.regexEnabled && primary.email && !EMAIL_REGEX.test(primary.email)) {
            errors.contactRecords = true;
            errors.contact_email = true;
            isValid = false;
          }
          if (getField("phone")?.regexEnabled && primary.phone && !PHONE_REGEX.test(primary.phone)) {
            errors.contactRecords = true;
            errors.contact_phone = true;
            isValid = false;
          }
          if (getField("name")?.regexEnabled && primary.name && !NAME_REGEX.test(primary.name)) {
            errors.contactRecords = true;
            errors.contact_name = true;
            isValid = false;
          }
          if (getField("address")?.regexEnabled && primary.contact && !TEXT_REGEX.test(primary.contact)) {
            errors.contactRecords = true;
            errors.contact_address = true;
            isValid = false;
          }
        }
      }
    }

    fields.forEach((f) => {
      const val = inst.formData[f.id];
      const hasMedia = val?.mediaUrl && val.mediaUrl.trim().length > 0;
      const hasMediaItems = val?.mediaItems && val.mediaItems.length > 0;
      const hasText = val?.value !== undefined && val?.value !== null && String(val.value).trim().length > 0;
      const hasList = Array.isArray(val?.value) && val.value.length > 0;

      if (f.validationRules?.required) {
        if (!hasMedia && !hasText && !hasList && !hasMediaItems) {
          errors[f.id] = true;
          isValid = false;
        }
      }

      if (hasText && f.validationRules?.regexType) {
        const textVal = String(val.value).trim();
        if (f.validationRules.regexType === "email" && !EMAIL_REGEX.test(textVal)) {
           errors[f.id] = true;
           isValid = false;
        }
        if (f.validationRules.regexType === "phone" && !PHONE_REGEX.test(textVal)) {
           errors[f.id] = true;
           isValid = false;
        }
        if (f.validationRules.regexType === "name" && !NAME_REGEX.test(textVal)) {
           errors[f.id] = true;
           isValid = false;
        }
      }
    });

    return { isValid, errors };
  };

  const normalizeSubmissionFieldValues = (
    formDataMap: Record<string, any>,
    fieldDefs: any[],
  ) => {
    return fieldDefs.map((field) => {
      const raw = formDataMap[field.id];
      const normalizedValue = Array.isArray(raw?.value)
        ? [...new Set(raw.value.map((v: any) => String(v).trim()).filter(Boolean))]
        : raw?.value ?? null;
      return {
        fieldDefinitionId: field.id,
        value: normalizedValue,
        mediaUrl: raw?.mediaUrl ?? null,
        mediaPublicId: raw?.mediaPublicId ?? null,
        mediaItems: Array.isArray(raw?.mediaItems) ? raw.mediaItems : [],
      };
    });
  };

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    let allValid = true;
    const nextInstances = instances.map(inst => {
      const { isValid, errors } = validateInstance(inst);
      if (!isValid) allValid = false;
      return { ...inst, validationErrors: errors };
    });
    setInstances(nextInstances);

    if (!allValid) {
      toast.error(t("validationFailed"));
      return;
    }

    setSubmittingAll(true);
    setSubmitAllError(null);

    const sessionId = crypto.randomUUID();
    const currentToken = window.location.pathname.split("/").pop() || tokenOrId;
    const endpoint = `/api/submissions/${currentToken}`;

    const submissionPromises = nextInstances.map(async (inst, idx) => {
      const fieldValues = normalizeSubmissionFieldValues(inst.formData, fields);
      const primaryContact = inst.contactRecords[0] || {};
      const resolvedClientName = primaryContact.name?.trim() || "Primary Contact";

      const payload = {
        clientName: resolvedClientName,
        clientContact: "",
        sessionId,
        contactRecords: inst.contactRecords.map((record: any) => ({
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

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to submit record ${idx + 1}`);
      }
      return json.data;
    });

    try {
      const results = await Promise.allSettled(submissionPromises);
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        const errorsMsg = failures.map((f: any) => f.reason?.message || "Unknown error").join(", ");
        throw new Error(errorsMsg);
      }

      toast.success(t("toastSubmitSaved"));
      setIsSubmitAllSuccess(true);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`draft_${tokenOrId}`);
      }
    } catch (err: any) {
      setSubmitAllError(err.message || "Failed to submit all forms");
      toast.error(err.message || "Failed to submit all forms");
    } finally {
      setSubmittingAll(false);
    }
  };

  const resolveErrorMessage = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return value;

    try {
      return te(normalized);
    } catch {
      try {
        return te(normalized.toLowerCase().replace(/\s+/g, "_"));
      } catch {
        return value;
      }
    }
  };

  // Render logic...
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error === "not_found") {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error")}</AlertTitle>
          <AlertDescription>{t("invalidLink")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isNeedsRewrite = submission?.status === "needs_rewrite";
  const isDraft = submission?.status === "draft";
  const isViewOnly = !isNew && !isNeedsRewrite && !isDraft;
  const displayTitle = formName || (isNew || isDraft ? t("formTitle") : t("viewingSubmission"));

  const hasAnyValue = fields.some((field) => {
    const val = formData[field.id];
    const hasText =
      Array.isArray(val?.value)
        ? val.value.length > 0
        : val?.value !== undefined &&
          val?.value !== null &&
          String(val.value).trim().length > 0;
    const hasMedia = !!val?.mediaUrl && val.mediaUrl.trim().length > 0;
    const hasMediaItems = (val?.mediaItems?.length ?? 0) > 0;

    return hasText || hasMedia || hasMediaItems;
  });

  const validate = () => {
    const errors: Record<string, boolean> = {};
    let isValid = true;

    if (!contactFormLocked) {
      if (contactRecords.length < 1) {
        errors.contactRecords = true;
        isValid = false;
      } else {
        const hasMissingRequiredContactField = contactFormFields.some((field) => {
          if (!field.required) return false;

          const value =
            field.key === "name"
              ? currentContactValues.name
              : field.key === "email"
                ? currentContactValues.email
                : field.key === "phone"
                  ? currentContactValues.phone
                  : currentContactValues.address;

          const isMissing = String(value ?? "").trim().length === 0;
          if (isMissing) {
            errors[`contact_${field.key}`] = true;
          }
          return isMissing;
        });

        if (hasMissingRequiredContactField) {
          errors.contactRecords = true;
          isValid = false;
        } else {
          const getField = (key: string) => contactFormFields.find(f => f.key === key);
          if (getField("email")?.regexEnabled && currentContactValues.email && !EMAIL_REGEX.test(currentContactValues.email)) {
            errors.contactRecords = true;
            errors.contact_email = true;
            isValid = false;
          }
          if (getField("phone")?.regexEnabled && currentContactValues.phone && !PHONE_REGEX.test(currentContactValues.phone)) {
            errors.contactRecords = true;
            errors.contact_phone = true;
            isValid = false;
          }
          if (getField("name")?.regexEnabled && currentContactValues.name && !NAME_REGEX.test(currentContactValues.name)) {
            errors.contactRecords = true;
            errors.contact_name = true;
            isValid = false;
          }
          if (getField("address")?.regexEnabled && currentContactValues.address && !TEXT_REGEX.test(currentContactValues.address)) {
            errors.contactRecords = true;
            errors.contact_address = true;
            isValid = false;
          }
        }
      }
    }

    fields.forEach((f) => {
      const val = formData[f.id];
      const hasMedia = val?.mediaUrl && val.mediaUrl.trim().length > 0;
      const hasMediaItems = val?.mediaItems && val.mediaItems.length > 0;
      const hasText = val?.value !== undefined && val?.value !== null && String(val.value).trim().length > 0;
      const hasList = Array.isArray(val?.value) && val.value.length > 0;

      if (f.validationRules?.required) {
        if (!hasMedia && !hasText && !hasList && !hasMediaItems) {
          errors[f.id] = true;
          isValid = false;
        }
      }

      if (hasText && f.validationRules?.regexType) {
        const textVal = String(val.value).trim();
        if (f.validationRules.regexType === "email" && !EMAIL_REGEX.test(textVal)) {
           errors[f.id] = true;
           isValid = false;
        }
        if (f.validationRules.regexType === "phone" && !PHONE_REGEX.test(textVal)) {
           errors[f.id] = true;
           isValid = false;
        }
        if (f.validationRules.regexType === "name" && !NAME_REGEX.test(textVal)) {
           errors[f.id] = true;
           isValid = false;
        }
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (isNew) {
      await submitForm(formData);
    } else if (isNeedsRewrite || isDraft) {
      await resubmitForm(formData);
    }
  };

  const getLatestUpdater = () => {
    if (submission?.auditTrail && submission.auditTrail.length > 0) {
      const entry = [...submission.auditTrail].reverse().find(e => e.newStatus === submission.status);
      return entry?.adminName || null;
    }
    return null;
  };

  const latestUpdater = getLatestUpdater();

  let statusAlert = null;
  if (isSubmitAllSuccess) {
     statusAlert = (
       <Alert className="mb-6 p-6 border-2 shadow-sm bg-primary/5 border-primary/30">
         <CheckCircle2 className="h-6 w-6 text-primary" />
         <AlertTitle className="text-xl font-bold text-primary">{t("submissionSuccess") || "Submission Successful"}</AlertTitle>
         <AlertDescription className="text-base mt-2 font-medium">
           {t("submissionSuccess") || "All submissions sent successfully."}
         </AlertDescription>
       </Alert>
     );
  } else if (submission && !isNeedsRewrite && !isDraft) {
     const liveClass = statusChangedLive ? "animate-pulse ring-4 ring-primary/50" : "";
     statusAlert = (
       <Alert className={`mb-6 p-6 border-2 shadow-sm bg-primary/5 border-primary/30 transition-all duration-500 ${liveClass}`}>
         <CheckCircle2 className="h-6 w-6 text-primary" />
         <AlertTitle className="text-xl font-bold text-primary">{t("submissionSuccess")}</AlertTitle>
         <AlertDescription className="text-base mt-2 font-medium flex items-center justify-between">
           <span>{submission.status === "viewed" ? t("statusViewed") : t("statusPending")}</span>
           {latestUpdater && (
             <span className="text-sm font-normal opacity-75 bg-primary/10 px-2 py-1 rounded">
               {t("updatedByAdmin", { name: latestUpdater })}
             </span>
           )}
         </AlertDescription>
       </Alert>
     );
  } else if (isNeedsRewrite) {
    const liveClass = statusChangedLive ? "animate-pulse ring-4 ring-destructive/50" : "";
    statusAlert = (
      <Alert variant="destructive" className={`mb-6 p-6 border-2 transition-all duration-500 ${liveClass}`}>
        <AlertCircle className="h-6 w-6" />
        <AlertTitle className="text-xl font-bold flex items-center justify-between">
          <span>{t("needsRewriteTitle")}</span>
          {latestUpdater && (
             <span className="text-sm font-normal opacity-90 bg-destructive/10 px-2 py-1 rounded">
               {t("updatedByAdmin", { name: latestUpdater })}
             </span>
           )}
        </AlertTitle>
        <AlertDescription className="mt-4 text-base">
          <p>{t("needsRewriteMessage")}</p>
          <div className="mt-3 text-sm italic border-s-4 border-destructive/60 bg-destructive/10 p-3 rounded-r-md">
            &quot;{submission?.rewriteComment}&quot;
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-1 py-4 sm:px-2 sm:py-6 md:py-8">
      {statusAlert}

      {isViewOnly && !hasAnyValue && fields.length > 0 && (
        <Alert className="mb-6 border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("viewingSubmission")}</AlertTitle>
          <AlertDescription>{tc("noResults")}</AlertDescription>
        </Alert>
      )}

      {droppedFieldIds.length > 0 && (
        <Alert className="mb-6 border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("droppedValuesTitle")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{t("droppedValuesDescription", { count: droppedFieldIds.length })}</span>
            <Button variant="outline" size="sm" type="button" onClick={clearDroppedFieldWarning}>
              {tc("close")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className={`shadow-lg border-t-4 ${isViewOnly ? "border-t-muted opacity-80" : "border-t-primary"}`}>
        <CardHeader className="space-y-4 pb-8">
          <div>
            <CardTitle className="text-2xl font-extrabold sm:text-3xl">{displayTitle}</CardTitle>
            {formDescription && (
              <CardDescription className="text-base mt-2 whitespace-pre-wrap">
                {formDescription}
              </CardDescription>
            )}
          </div>
        </CardHeader>

        <form onSubmit={multiInstanceEnabled ? handleSubmitAll : handleSubmit}>
          <CardContent className="space-y-8">
            {aiAutoFillEnabled && (
              <div className="space-y-4">
                <AiPhotoUpload
                  onFileSelected={handleExtractFromPhoto}
                  isExtracting={isExtracting}
                  stage={aiStage}
                  elapsedSeconds={aiElapsedSeconds}
                  disabled={isViewOnly}
                  locale={locale}
                />
                <AiExtractionSummary
                  stage={aiStage}
                  autoFilledFieldIds={autoFilledFieldIds}
                  autoFilledKeys={autoFilledKeys}
                  error={aiError}
                  warning={aiWarning}
                  onRetry={retryExtraction}
                  onContinueManually={resetAiState}
                  fieldDefinitions={fields}
                  contactFormFields={contactFormFields}
                  retryCount={aiRetryCount}
                  locale={locale}
                />
              </div>
            )}

            {multiInstanceEnabled ? (
              <div className="space-y-12">
                {instances.map((inst, index) => (
                  <Card key={inst.id} className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-6 relative bg-card">
                    {instances.length > 1 && !isViewOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInstance(inst.id)}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors text-sm font-semibold flex items-center gap-1"
                        title={t("removeInstance")}
                      >
                        <X className="h-4 w-4" />
                        <span className="hidden sm:inline">{t("removeInstance")}</span>
                      </button>
                    )}
                    <div className="text-lg font-bold border-b pb-2 text-primary flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      {t("instanceCounter", { current: index + 1, total: instances.length })}
                    </div>

                    {!contactFormLocked && (
                      <ContactRecords
                        formFields={contactFormFields}
                        records={inst.contactRecords}
                        disabled={isViewOnly || isSubmitting || submittingAll}
                        showValidation={!!inst.validationErrors.contactRecords}
                        validationErrors={inst.validationErrors}
                        autoFilledKeys={autoFilledKeys}
                        onUpdate={(cid, patch) => {
                          updateInstanceContactRecord(inst.id, cid, patch);
                        }}
                      />
                    )}

                    <div className="space-y-6">
                      {fields.map((field) => {
                        const currentVal = inst.formData[field.id];
                        return (
                          <div key={field.id} className="p-1">
                            <FieldRenderer
                              field={field}
                              value={currentVal?.value}
                              mediaUrl={currentVal?.mediaUrl}
                              mediaPublicId={currentVal?.mediaPublicId}
                              mediaItems={currentVal?.mediaItems}
                              isAutoFilled={autoFilledFieldIds.has(field.id)}
                              onChangeValue={(v) => {
                                updateInstanceFieldValue(inst.id, field.id, v);
                              }}
                              onChangeMedia={(url, pid) => {
                                updateInstanceMediaValue(inst.id, field.id, url, pid);
                              }}
                              onChangeMediaItems={(items) => {
                                updateInstanceMediaItems(inst.id, field.id, items);
                              }}
                              hasError={inst.validationErrors[field.id]}
                              disabled={isViewOnly}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}

                {!isViewOnly && (
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddInstance}
                      disabled={submittingAll || !!(maxInstances && instances.length >= maxInstances) || instances.length >= 50}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="me-2 h-4 w-4" />
                      {t("addAnother")}
                      {maxInstances && ` (${instances.length}/${maxInstances})`}
                    </Button>

                    {(maxInstances && instances.length >= maxInstances) && (
                      <span className="text-xs text-amber-600 font-medium">
                        {t("instanceLimitReached", { count: maxInstances })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {!contactFormLocked && (
                  <ContactRecords
                    formFields={contactFormFields}
                    records={contactRecords}
                    disabled={isViewOnly || isSubmitting}
                    showValidation={!!validationErrors.contactRecords}
                    validationErrors={validationErrors}
                    autoFilledKeys={autoFilledKeys}
                    onUpdate={(id, patch) => {
                      updateContactRecord(id, patch);
                      Object.keys(patch).forEach((key) => {
                        clearAutoFillContactIndicator(key);
                      });
                      setValidationErrors((prev) => {
                        const next = { ...prev };
                        Object.keys(patch).forEach((key) => {
                          delete next[`contact_${key}`];
                        });
                        const hasContactErrors = Object.keys(next).some((k) => k.startsWith("contact_"));
                        if (!hasContactErrors) {
                          next.contactRecords = false;
                        }
                        return next;
                      });
                    }}
                  />
                )}

                <div className="space-y-6">
                  {fields.map((field) => {
                    const currentVal = formData[field.id];
                    return (
                      <div key={field.id} className="p-1">
                        <FieldRenderer
                          field={field}
                          value={currentVal?.value}
                          mediaUrl={currentVal?.mediaUrl}
                          mediaPublicId={currentVal?.mediaPublicId}
                          mediaItems={currentVal?.mediaItems}
                          isAutoFilled={autoFilledFieldIds.has(field.id)}
                          onChangeValue={(v) => {
                            setFieldValue(field.id, v);
                            clearAutoFillIndicator(field.id);
                            if (validationErrors[field.id]) setValidationErrors(prev => ({ ...prev, [field.id]: false }));
                          }}
                          onChangeMedia={(url, pid) => {
                            setMediaValue(field.id, url, pid);
                            if (validationErrors[field.id]) setValidationErrors(prev => ({ ...prev, [field.id]: false }));
                          }}
                          onChangeMediaItems={(items) => {
                            setMediaItems(field.id, items);
                            if (validationErrors[field.id]) setValidationErrors(prev => ({ ...prev, [field.id]: false }));
                          }}
                          hasError={validationErrors[field.id]}
                          disabled={isViewOnly}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>

            {submitAllError && (
              <div className="px-6 pb-2">
                 <p className="text-sm text-destructive font-semibold">
                   {submitAllError}
                 </p>
              </div>
            )}

            {error && error !== "not_found" && (
              <div className="px-6 pb-2">
                 <p className="text-sm text-destructive">
                   {resolveErrorMessage(error)}
                 </p>
              </div>
            )}

            {!isViewOnly && (
              <CardFooter className="bg-muted/10 pt-6 mt-4 border-t">
                <Button type="submit" className="w-full sm:w-auto" size="lg" disabled={isSubmitting || submittingAll}>
                  {(isSubmitting || submittingAll) ? (
                    <Loader2 className="me-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="me-2 h-5 w-5" />
                  )}
                  {multiInstanceEnabled 
                    ? (t("submitAll") || "Submit All")
                    : (isNew || isDraft ? t("submitButton") : t("resubmitButton"))
                  }
                </Button>
              </CardFooter>
            )}
        </form>
      </Card>

      {isViewOnly && canAddMoreReplies && formTemplateId && (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="gap-2 border-primary text-primary hover:bg-primary/10"
            onClick={() => {
              window.location.href = `/${locale}/f/${formTemplateId}`;
            }}
          >
            <PlusCircle className="h-5 w-5" />
            {t("newAnswerButton")}
          </Button>
        </div>
      )}

      <AlertDialog open={showOverwriteConfirm} onOpenChange={(open) => { if (!open) confirmOverwrite(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tAi("overwriteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tAi("overwriteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => confirmOverwrite(false)}>{tAi("overwriteCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmOverwrite(true)}>{tAi("overwriteConfirmButton")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
