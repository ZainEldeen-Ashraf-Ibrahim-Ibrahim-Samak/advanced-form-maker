"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, AlertCircle, Sparkles } from "lucide-react";
import EmailRegix from "@/components/validation/EmailRegix";
import PhoneRegix from "@/components/validation/PhoneRegix";
import NameRegix from "@/components/validation/NameRegix";
import { TEXT_REGEX } from "@/constants/constants";
import type { ContactRecordDraft } from "@/presentation/view-models/use-submission";
import type { ContactFormField } from "@/domain/entities/form-template";

interface ContactRecordsProps {
  formFields: ContactFormField[];
  records: ContactRecordDraft[];
  disabled?: boolean;
  showValidation?: boolean;
  onUpdate: (id: string, patch: Partial<Omit<ContactRecordDraft, "id">>) => void;
  autoFilledKeys?: Set<string>;
}


export function ContactRecords({
  formFields,
  records,
  disabled = false,
  showValidation = false,
  onUpdate,
  autoFilledKeys = new Set(),
}: ContactRecordsProps) {
  const t = useTranslations("client");
  const tv = useTranslations("VALIDATION");
  const tAi = useTranslations("aiExtraction");
  const locale = useLocale();

  const controlWrapper = (fieldKey: string, children: React.ReactNode) => {
    if (!autoFilledKeys.has(fieldKey)) return children;
    return (
      <div className="relative group/ai">
        {children}
        <div
          className="absolute -top-2.5 end-2 z-10 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full shadow-sm select-none"
          title={tAi("autoFilledBadge") || "Auto-filled by AI"}
        >
          <Sparkles className="h-2.5 w-2.5 animate-pulse" />
          <span>{tAi("autoFilledBadge")}</span>
        </div>
      </div>
    );
  };


  const contactRecord = useMemo<ContactRecordDraft>(() => {
    if (records.length > 0) return records[0];

    return {
      id: "fallback_contact_record",
      name: "",
      email: "",
      phone: "",
      address: "",
      mediaUrl: null,
      mediaPublicId: null,
    };
  }, [records]);

  const orderedFields = useMemo(
    () => [...formFields].sort((a, b) => a.sortOrder - b.sortOrder),
    [formFields],
  );

  const getFieldValue = (field: ContactFormField) => {
    switch (field.key) {
      case "name":
        return contactRecord.name;
      case "email":
        return contactRecord.email;
      case "phone":
        return contactRecord.phone;
      case "address":
        return contactRecord.address;
      default:
        return "";
    }
  };

  const updateFieldValue = (field: ContactFormField, value: string) => {
    if (field.key === "name") {
      onUpdate(contactRecord.id, { name: value });
      return;
    }

    if (field.key === "email") {
      onUpdate(contactRecord.id, { email: value });
      return;
    }

    if (field.key === "phone") {
      onUpdate(contactRecord.id, { phone: value });
      return;
    }

    onUpdate(contactRecord.id, { address: value });
  };

  const getInputType = (field: ContactFormField) => {
    if (field.key === "email") return "email";
    if (field.key === "phone") return "tel";
    return "text";
  };

  const getFallbackPlaceholder = (field: ContactFormField) => {
    if (field.key === "name") return t("contactRecordNamePlaceholder");
    if (field.key === "email") return t("contactRecordEmailPlaceholder");
    if (field.key === "phone") return t("contactRecordPhonePlaceholder");
    return t("contactRecordAddressPlaceholder");
  };

  const getLocalizedLabel = (field: ContactFormField) => {
    if (locale === "ar") {
      return field.labelAr || field.label || field.labelEn;
    }

    return field.labelEn || field.label || field.labelAr;
  };

  const getLocalizedPlaceholder = (field: ContactFormField) => {
    if (locale === "ar") {
      return field.placeholderAr || field.placeholder || field.placeholderEn || getFallbackPlaceholder(field);
    }

    return field.placeholderEn || field.placeholder || field.placeholderAr || getFallbackPlaceholder(field);
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="space-y-1">
        <div className="space-y-1">
          <h4 className="text-base font-semibold">
            {t("contactFormTitle")}
          </h4>
          <p className="text-xs text-muted-foreground">{t("contactFormDescription")}</p>
        </div>
      </div>

      {showValidation && (
        <p className="text-sm text-destructive">{t("contactRecordRequired")}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {orderedFields.map((field) => {
          const fieldValue = getFieldValue(field);
          const isValidText = fieldValue.length === 0 || TEXT_REGEX.test(fieldValue);

          return (
            <div
              key={field.id}
              className={field.key === "address" ? "space-y-1 sm:col-span-2" : "space-y-1"}
            >
              <Label htmlFor={`contact-${field.key}-${field.id}`} className="flex items-center gap-1">
                <span>{getLocalizedLabel(field)}</span>
                {field.required && <span className="text-destructive">*</span>}
              </Label>

              {controlWrapper(
                field.key,
                <Input
                  id={`contact-${field.key}-${field.id}`}
                  type={getInputType(field)}
                  value={fieldValue}
                  onChange={(e) => updateFieldValue(field, e.target.value)}
                  placeholder={getLocalizedPlaceholder(field)}
                  disabled={disabled}
                  required={field.required}
                  className={autoFilledKeys.has(field.key) ? "border-primary/50 focus-visible:ring-primary/50 ring-1 ring-primary/20" : ""}
                />
              )}

              {!disabled && field.key === "email" && field.regexEnabled && (
                <EmailRegix email={fieldValue} showTypoSuggestions={true} />
              )}

              {!disabled && field.key === "phone" && field.regexEnabled && (
                <PhoneRegix
                  number={fieldValue}
                  setNumber={(value) => updateFieldValue(field, value)}
                />
              )}

              {!disabled && field.key === "name" && field.regexEnabled && (
                <NameRegix name={fieldValue} />
              )}

              {!disabled && field.key === "address" && fieldValue.length > 0 && (
                <div
                  className={`text-sm mt-2 p-2 pb-3 rounded-md flex items-start ${
                    isValidText
                      ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                      : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  }`}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                >
                  {isValidText ? (
                    <>
                      <Check size={16} className={`${locale === "ar" ? "ml-2" : "mr-2"} mt-0.5 shrink-0`} />
                      <span>{tv("VALID_TEXT")}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} className={`${locale === "ar" ? "ml-2" : "mr-2"} mt-0.5 shrink-0`} />
                      <span>{tv("INVALID_TEXT_DETAILS")}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
