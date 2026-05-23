import { useState, useEffect, useCallback, useRef } from "react";
import { ExtractionResult } from "@/domain/entities/ai-extraction";

export type ExtractionStage = "idle" | "uploading" | "analyzing" | "extracting" | "success" | "error";

interface UseAiExtractionParams {
  fieldDefinitions: any[];
  contactFormFields: any[];
  currentFieldValues: Record<string, string | number | null>;
  currentContactValues: Record<string, string>;
  onApplyField: (fieldId: string, value: string | number) => void;
  onApplyContact: (key: string, value: string) => void;
  locale: "en" | "ar";
}

export function useAiExtraction({
  fieldDefinitions,
  contactFormFields,
  currentFieldValues,
  currentContactValues,
  onApplyField,
  onApplyContact,
  locale,
}: UseAiExtractionParams) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [stage, setStage] = useState<ExtractionStage>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [autoFilledFieldIds, setAutoFilledFieldIds] = useState<Set<string>>(new Set());
  const [autoFilledKeys, setAutoFilledKeys] = useState<Set<string>>(new Set());
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const lastFileRef = useRef<File | null>(null);
  const pendingDataRef = useRef<ExtractionResult | null>(null);

  // Time tracking effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isExtracting) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isExtracting]);

  // Convert File to Base64
  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Image quality resolution pre-validation
  const validateImageResolution = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error("invalidImage"));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const applyExtraction = useCallback((result: ExtractionResult, overwrite: boolean) => {
    const newFilledFields = new Set<string>();
    const newFilledKeys = new Set<string>();

    // 1. Apply contact fields
    if (result.contactData) {
      for (const [key, value] of Object.entries(result.contactData)) {
        if (value !== null && value !== undefined) {
          const currentValue = currentContactValues[key] || "";
          const hasValue = currentValue.trim().length > 0;

          if (overwrite || !hasValue) {
            onApplyContact(key, value);
            newFilledKeys.add(key);
          }
        }
      }
    }

    // 2. Apply custom form fields
    if (result.fieldValues) {
      for (const [fieldId, extraction] of Object.entries(result.fieldValues)) {
        const val = extraction.value;
        if (val !== null && val !== undefined) {
          const currentValue = currentFieldValues[fieldId];
          const hasValue = currentValue !== null && currentValue !== undefined && String(currentValue).trim().length > 0;

          if (overwrite || !hasValue) {
            onApplyField(fieldId, val);
            newFilledFields.add(fieldId);
          }
        }
      }
    }

    setAutoFilledFieldIds((prev) => {
      const next = new Set(prev);
      newFilledFields.forEach((id) => next.add(id));
      return next;
    });

    setAutoFilledKeys((prev) => {
      const next = new Set(prev);
      newFilledKeys.forEach((k) => next.add(k));
      return next;
    });

    setStage("success");
    setIsExtracting(false);
    setShowOverwriteConfirm(false);
    pendingDataRef.current = null;
  }, [currentContactValues, currentFieldValues, onApplyContact, onApplyField]);

  const handleExtractFromPhoto = async (file: File) => {
    lastFileRef.current = file;
    setIsExtracting(true);
    setStage("uploading");
    setError(null);
    setWarning(null);
    setShowOverwriteConfirm(false);
    pendingDataRef.current = null;

    try {
      // 1. Client-side validation: Max 10MB size
      const maxSizeBytes = 10 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        throw new Error("fileTooLarge");
      }

      // Accepted mime types check
      const acceptedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      if (!acceptedMimeTypes.includes(file.type)) {
        throw new Error("invalidImage");
      }

      // 2. Pre-validate image resolution
      try {
        const { width, height } = await validateImageResolution(file);
        if (width < 640 || height < 480) {
          setError(locale === "ar" ? "دقة الصورة منخفضة جداً. يجب أن تكون الصورة على الأقل 640×480 بكسل." : "Resolution too low. Image must be at least 640x480 pixels.");
          setStage("error");
          setIsExtracting(false);
          return;
        }

        if (width < 1024 || height < 768) {
          setWarning(locale === "ar" ? "دقة الصورة أقل من الموصى بها (1024×768). قد تكون دقة الاستخراج أقل." : "Image resolution is below recommended 1024x768. Text extraction might be less accurate.");
        }
      } catch (err) {
        throw new Error("invalidImage");
      }

      // 3. Stage update
      setStage("analyzing");
      const base64Data = await toBase64(file);

      // 4. Collect field/contact metadata
      const cleanFieldDefs = fieldDefinitions
        .filter((field) => field.inputType !== "image" && field.inputType !== "file")
        .map((field) => ({
          id: field.id,
          nameEn: field.nameEn,
          nameAr: field.nameAr,
          inputType: field.inputType,
          dropdownOptionsEn: field.dropdownOptionsEn || [],
          dropdownOptionsAr: field.dropdownOptionsAr || [],
        }));

      const cleanContactFields = contactFormFields.map((field) => ({
        key: field.key,
        labelEn: field.labelEn,
        labelAr: field.labelAr,
      }));

      // 5. Stage update
      setStage("extracting");

      // 6. Call API
      const response = await fetch("/api/ai/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          imageMimeType: file.type,
          fieldDefinitions: cleanFieldDefs,
          contactFields: cleanContactFields,
          locale,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        const errorMsg = json.error || "extractionFailed";
        throw new Error(errorMsg);
      }

      const result = json.data as ExtractionResult;
      
      if (result.status === "failure") {
        throw new Error("notADocument");
      }

      // 7. Check for overwrite conditions
      let hasOverwriteCandidates = false;

      if (result.contactData) {
        for (const [key, value] of Object.entries(result.contactData)) {
          if (value !== null && value !== undefined) {
            const currentValue = currentContactValues[key] || "";
            if (currentValue.trim().length > 0 && currentValue.trim() !== value.trim()) {
              hasOverwriteCandidates = true;
              break;
            }
          }
        }
      }

      if (!hasOverwriteCandidates && result.fieldValues) {
        for (const [fieldId, extraction] of Object.entries(result.fieldValues)) {
          const val = extraction.value;
          if (val !== null && val !== undefined) {
            const currentValue = currentFieldValues[fieldId];
            if (currentValue !== null && currentValue !== undefined && String(currentValue).trim().length > 0 && String(currentValue).trim() !== String(val).trim()) {
              hasOverwriteCandidates = true;
              break;
            }
          }
        }
      }

      if (hasOverwriteCandidates) {
        pendingDataRef.current = result;
        setShowOverwriteConfirm(true);
      } else {
        applyExtraction(result, false);
      }

    } catch (err: any) {
      setIsExtracting(false);
      setStage("error");
      setError(err.message || "extractionFailed");
    }
  };

  const retryExtraction = () => {
    if (lastFileRef.current && retryCount < 2) {
      setRetryCount((prev) => prev + 1);
      handleExtractFromPhoto(lastFileRef.current);
    }
  };

  const confirmOverwrite = (confirm: boolean) => {
    if (pendingDataRef.current) {
      applyExtraction(pendingDataRef.current, confirm);
    }
  };

  const clearAutoFillIndicator = (fieldId: string) => {
    setAutoFilledFieldIds((prev) => {
      if (prev.has(fieldId)) {
        const next = new Set(prev);
        next.delete(fieldId);
        return next;
      }
      return prev;
    });
  };

  const clearAutoFillContactIndicator = (key: string) => {
    setAutoFilledKeys((prev) => {
      if (prev.has(key)) {
        const next = new Set(prev);
        next.delete(key);
        return next;
      }
      return prev;
    });
  };

  const resetState = () => {
    setIsExtracting(false);
    setStage("idle");
    setError(null);
    setWarning(null);
    setShowOverwriteConfirm(false);
    setRetryCount(0);
    setAutoFilledFieldIds(new Set());
    setAutoFilledKeys(new Set());
    lastFileRef.current = null;
    pendingDataRef.current = null;
  };

  return {
    isExtracting,
    stage,
    elapsedSeconds,
    error,
    warning,
    autoFilledFieldIds,
    autoFilledKeys,
    showOverwriteConfirm,
    retryCount,
    handleExtractFromPhoto,
    retryExtraction,
    confirmOverwrite,
    clearAutoFillIndicator,
    clearAutoFillContactIndicator,
    resetState,
  };
}
