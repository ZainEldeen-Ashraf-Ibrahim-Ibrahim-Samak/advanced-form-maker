"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSubmission } from "@/presentation/view-models/use-submission";
import { FieldRenderer } from "./field-renderer";
import { ContactRecords } from "./contact-records";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
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
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

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
        const primaryContact = contactRecords[0];
        const hasMissingRequiredContactField = contactFormFields.some((field) => {
          if (!field.required) return false;

          const value =
            field.key === "name"
              ? primaryContact.name
              : field.key === "email"
                ? primaryContact.email
                : field.key === "phone"
                  ? primaryContact.phone
                  : primaryContact.address;

          return String(value ?? "").trim().length === 0;
        });

        if (hasMissingRequiredContactField) {
          errors.contactRecords = true;
          isValid = false;
        } else {
          if (primaryContact.email && !EMAIL_REGEX.test(primaryContact.email)) {
            errors.contactRecords = true;
            isValid = false;
          }
          if (primaryContact.phone && !PHONE_REGEX.test(primaryContact.phone)) {
            errors.contactRecords = true;
            isValid = false;
          }
          if (primaryContact.name && !NAME_REGEX.test(primaryContact.name)) {
            errors.contactRecords = true;
            isValid = false;
          }
          if (primaryContact.address && !TEXT_REGEX.test(primaryContact.address)) {
            errors.contactRecords = true;
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
  if (submission && !isNeedsRewrite && !isDraft) {
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

        <form onSubmit={handleSubmit}>
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

            {!contactFormLocked && (
              <ContactRecords
                formFields={contactFormFields}
                records={contactRecords}
                disabled={isViewOnly || isSubmitting}
                showValidation={!!validationErrors.contactRecords}
                autoFilledKeys={autoFilledKeys}
                onUpdate={(id, patch) => {
                  updateContactRecord(id, patch);
                  Object.keys(patch).forEach((key) => {
                    clearAutoFillContactIndicator(key);
                  });
                  if (validationErrors.contactRecords) {
                    setValidationErrors((prev) => ({ ...prev, contactRecords: false }));
                  }
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
          </CardContent>

            {error && error !== "not_found" && (
              <div className="px-6 pb-2">
                 <p className="text-sm text-destructive">
                   {resolveErrorMessage(error)}
                 </p>
              </div>
            )}

            {!isViewOnly && (
              <CardFooter className="bg-muted/10 pt-6 mt-4 border-t">
                <Button type="submit" className="w-full sm:w-auto" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="me-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="me-2 h-5 w-5" />
                  )}
                  {isNew || isDraft ? t("submitButton") : t("resubmitButton")}
                </Button>
              </CardFooter>
            )}
        </form>
      </Card>

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
