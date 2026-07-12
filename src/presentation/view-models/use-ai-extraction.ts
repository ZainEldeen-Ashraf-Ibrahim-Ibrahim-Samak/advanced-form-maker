import { useState, useEffect, useCallback, useRef } from "react";
import { ExtractionResult } from "@/domain/entities/ai-extraction";

export type ExtractionStage = "idle" | "uploading" | "analyzing" | "extracting" | "success" | "error";

const supportedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

const supportedDocumentMimeTypes = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const hasSupportedExtension = (fileName: string, extensions: string[]) =>
  extensions.some((extension) => fileName.endsWith(extension));

const getAiExtractionFileKind = (file: File): "image" | "document" | null => {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  if (
    supportedImageMimeTypes.has(mimeType) ||
    hasSupportedExtension(fileName, [".jpg", ".jpeg", ".png", ".webp", ".heic"])
  ) {
    return "image";
  }

  if (
    supportedDocumentMimeTypes.has(mimeType) ||
    hasSupportedExtension(fileName, [".pdf", ".csv", ".xls", ".xlsx", ".doc", ".docx"])
  ) {
    return "document";
  }

  return null;
};

interface UseAiExtractionParams {
  fieldDefinitions: any[];
  contactFormFields: any[];
  currentFieldValues: Record<string, string | number | null>;
  currentContactValues: Record<string, string>;
  onApplyField: (fieldId: string, value: string | number) => void;
  onApplyContact: (key: string, value: string) => void;
  locale: "en" | "ar";
  multiInstanceEnabled?: boolean;
  maxInstances?: number | null;
  onApplyMultipleRecords?: (records: ExtractionResult[]) => void;
}

export function useAiExtraction({
  fieldDefinitions,
  contactFormFields,
  currentFieldValues,
  currentContactValues,
  onApplyField,
  onApplyContact,
  locale,
  multiInstanceEnabled = false,
  maxInstances = null,
  onApplyMultipleRecords,
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
  
  const lastFilesRef = useRef<File[] | null>(null);
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

  // Image resolution pre-validation
  const validateImageResolution = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error("invalidFile"));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // Re-encode an oversized image as JPEG, downscaling only as much as needed to
  // fit the size cap. Full-resolution phone photos (common for handwritten
  // documents) can exceed the 10MB limit even though the content itself is
  // perfectly extractable — reject only if it still doesn't fit after this.
  const compressImageIfNeeded = (file: File, maxSizeBytes: number): Promise<File> => {
    if (file.size <= maxSizeBytes) return Promise.resolve(file);

    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement("canvas");
        const { width, height } = img;
        let scale = 1;

        const tryEncode = (): void => {
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("invalidFile")); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error("invalidFile")); return; }
            if (blob.size <= maxSizeBytes || scale <= 0.2) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
            } else {
              scale -= 0.15;
              tryEncode();
            }
          }, "image/jpeg", 0.85);
        };

        tryEncode();
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("invalidFile"));
      };
      img.src = objectUrl;
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

  const maxImages = 5;

  const handleExtractFromPhoto = async (fileOrFiles: File | File[]) => {
    let files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (files.length === 0) return;
    if (files.length > maxImages) {
      files = files.slice(0, maxImages);
    }

    lastFilesRef.current = files;
    setIsExtracting(true);
    setStage("uploading");
    setError(null);
    setWarning(null);
    setShowOverwriteConfirm(false);
    pendingDataRef.current = null;

    try {
      const maxSizeBytes = 500 * 1024 * 1024;
      let lowResolutionWarning = false;

      const processedFiles: File[] = [];
      for (let file of files) {
        const fileKind = getAiExtractionFileKind(file);
        if (!fileKind) {
          throw new Error("invalidFile");
        }

        // 1. Images: downscale/re-compress oversized photos instead of rejecting them outright
        if (fileKind === "image" && file.size > maxSizeBytes) {
          try {
            file = await compressImageIfNeeded(file, maxSizeBytes);
          } catch {
            throw new Error("fileTooLarge");
          }
        }

        // Non-image documents (PDF/Word/etc.) can't be re-compressed client-side
        if (file.size > maxSizeBytes) {
          throw new Error("fileTooLarge");
        }

        if (fileKind === "image") {
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
              lowResolutionWarning = true;
            }
          } catch (err) {
            throw new Error("invalidFile");
          }
        }

        processedFiles.push(file);
      }

      if (lowResolutionWarning) {
        setWarning(locale === "ar" ? "دقة الصورة أقل من الموصى بها (1024×768). قد تكون دقة الاستخراج أقل." : "Image resolution is below recommended 1024x768. Text extraction might be less accurate.");
      }

      // 3. Stage update
      setStage("analyzing");
      const images = await Promise.all(
        processedFiles.map(async (file) => ({
          data: await toBase64(file),
          mimeType: file.type,
        }))
      );

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
          images,
          fieldDefinitions: cleanFieldDefs,
          contactFields: cleanContactFields,
          locale,
          multiInstanceEnabled,
          maxInstances,
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

      if (multiInstanceEnabled && result.records && result.records.length > 0 && onApplyMultipleRecords) {
        onApplyMultipleRecords(result.records);
        setStage("success");
        setIsExtracting(false);
        return;
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
    if (lastFilesRef.current && retryCount < 2) {
      setRetryCount((prev) => prev + 1);
      handleExtractFromPhoto(lastFilesRef.current);
    }
  };

  const confirmOverwrite = (confirm: boolean) => {
    const pendingData = pendingDataRef.current;
    if (pendingData) {
      pendingDataRef.current = null;
      applyExtraction(pendingData, confirm);
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
    lastFilesRef.current = null;
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
