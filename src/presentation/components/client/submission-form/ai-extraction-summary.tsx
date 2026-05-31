import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ExtractionStage } from "@/presentation/view-models/use-ai-extraction";

interface AiExtractionSummaryProps {
  stage: ExtractionStage;
  error: string | null;
  warning: string | null;
  autoFilledFieldIds: Set<string>;
  autoFilledKeys: Set<string>;
  fieldDefinitions: any[];
  contactFormFields: any[];
  onRetry: () => void;
  onContinueManually: () => void;
  retryCount: number;
  locale: "en" | "ar";
}

export function AiExtractionSummary({
  stage,
  error,
  warning,
  autoFilledFieldIds,
  autoFilledKeys,
  fieldDefinitions,
  contactFormFields,
  onRetry,
  onContinueManually,
  retryCount,
  locale,
}: AiExtractionSummaryProps) {
  const t = useTranslations("aiExtraction");
  const [showDetails, setShowDetails] = useState(false);

  const totalFieldsCount = fieldDefinitions.length + contactFormFields.length;
  const filledCount = autoFilledFieldIds.size + autoFilledKeys.size;
  const isPartial = filledCount > 0 && filledCount < totalFieldsCount;

  // Trigger Toast Notification on success
  useEffect(() => {
    if (stage === "success" && filledCount > 0) {
      toast.success(
        locale === "ar"
          ? `تم ملء ${filledCount} حقول بواسطة الذكاء الاصطناعي`
          : `Auto-filled ${filledCount} fields using AI`
      );
    }
  }, [stage, filledCount, locale]);

  if (stage === "idle" || stage === "uploading" || stage === "analyzing" || stage === "extracting") {
    return null;
  }

  // Helper to get translated error message
  const getErrorMessage = () => {
    if (!error) return "";
    switch (error) {
      case "fileTooLarge":
        return t("fileTooLarge");
      case "invalidFile":
      case "invalidImage":
        return t("invalidFile");
      case "notADocument":
        return t("notADocument");
      case "timeout":
        return t("timeout");
      default:
        return t("extractionFailed");
    }
  };

  // Helper to get error guidance
  const getErrorGuidance = () => {
    if (error === "notADocument" || error === "extractionFailed") {
      return locale === "ar"
        ? "تلميح: حاول رفع ملف أو صورة أوضح مع نص مقروء وإضاءة جيدة وتجنب الانعكاسات."
        : "Tip: Try uploading a clearer file or photo with readable text, good lighting, and minimal glare.";
    }
    if (error === "timeout") {
      return locale === "ar"
        ? "تلميح: قد يكون الاتصال بالشبكة بطيئاً. يرجى إعادة المحاولة."
        : "Tip: The connection might be slow. Please try again.";
    }
    return "";
  };

  return (
    <div className="w-full space-y-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Warning Toast/Banner for low resolution */}
      {warning && stage === "success" && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/5 text-amber-600 dark:text-amber-500">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{locale === "ar" ? "تنبيه الدقة" : "Resolution Warning"}</AlertTitle>
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      )}

      {stage === "error" ? (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold">{t("extractionFailed")}</AlertTitle>
          <AlertDescription className="mt-1 space-y-3">
            <p className="text-sm">{getErrorMessage()}</p>
            {getErrorGuidance() && (
              <p className="text-xs text-muted-foreground italic">{getErrorGuidance()}</p>
            )}
            
            <div className="flex flex-wrap gap-2 mt-4">
              {retryCount < 2 && (
                <Button variant="outline" size="sm" onClick={onRetry} className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-pulse" />
                  {t("retry")} ({2 - retryCount} {locale === "ar" ? "محاولات متبقية" : "retries left"})
                </Button>
              )}
              {retryCount >= 2 && (
                <p className="text-xs text-red-500 font-medium self-center">
                  {locale === "ar" ? "يرجى ملء النموذج يدوياً." : "Please fill in the form manually."}
                </p>
              )}
              <Button variant="ghost" size="sm" onClick={onContinueManually}>
                {t("continueManually")}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="default" className="border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/10">
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
          <AlertTitle className="font-semibold text-emerald-700 dark:text-emerald-500">
            {t("extractionSuccess")}
          </AlertTitle>
          
          <AlertDescription className="mt-1 text-emerald-800 dark:text-emerald-400 space-y-2">
            <p className="text-sm">
              {isPartial ? t("extractionPartial") : t("noMatchingFields")}
            </p>

            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-semibold">
                {locale === "ar"
                  ? `تم ملء ${filledCount} من أصل ${totalFieldsCount} حقول`
                  : `Filled ${filledCount} of ${totalFieldsCount} fields`}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-500/10 font-semibold border border-red-300 dark:border-red-800"
                  onClick={onContinueManually}
                  title={locale === "ar" ? "مسح مستند آخر إذا كانت البيانات غير صحيحة" : "Re-scan if the data looks wrong"}
                >
                  <RefreshCw className="h-3 w-3" />
                  {t("rescan")}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs flex items-center gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-500/10"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {locale === "ar" ? "التفاصيل" : "Details"}
                  {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {showDetails && (
              <div className="mt-4 border-t border-emerald-500/20 pt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Contact fields status */}
                <div>
                  <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1.5">
                    {locale === "ar" ? "بيانات التواصل" : "Contact Details"}
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {contactFormFields.map((field) => {
                      const isFilled = autoFilledKeys.has(field.key);
                      return (
                        <div key={field.key} className="flex items-center justify-between text-xs p-1.5 rounded bg-background/50 border border-emerald-500/10">
                          <span className="text-foreground">{locale === "ar" ? field.labelAr : field.labelEn}</span>
                          {isFilled ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold text-[10px]">
                              <Check className="h-3 w-3" /> {locale === "ar" ? "تم الملء" : "Filled"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground text-[10px]">
                              <X className="h-3 w-3" /> {locale === "ar" ? "فارغ" : "Empty"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom fields status */}
                {fieldDefinitions.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1.5">
                      {locale === "ar" ? "الحقول الإضافية" : "Additional Fields"}
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {fieldDefinitions
                        .filter((field) => field.inputType !== "image" && field.inputType !== "file")
                        .map((field) => {
                          const isFilled = autoFilledFieldIds.has(field.id);
                          return (
                            <div key={field.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-background/50 border border-emerald-500/10">
                              <span className="text-foreground">{locale === "ar" ? field.nameAr : field.nameEn}</span>
                              {isFilled ? (
                                <span className="flex items-center gap-1 text-emerald-600 font-semibold text-[10px]">
                                  <Check className="h-3 w-3" /> {locale === "ar" ? "تم الملء" : "Filled"}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-muted-foreground text-[10px]">
                                  <X className="h-3 w-3" /> {locale === "ar" ? "فارغ" : "Empty"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
