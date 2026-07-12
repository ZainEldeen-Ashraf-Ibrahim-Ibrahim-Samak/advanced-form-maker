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

  // Re-encode any image to a normalized JPEG so the MIME type sent to the API
  // always matches the server's strict allow-list. Phone cameras/gallery pickers
  // frequently report nonstandard or empty `file.type` values (e.g. "image/jpg",
  // "", HEIC variants), which otherwise get rejected by the server as invalid.
  const normalizeImageMimeType = (file: File): Promise<File> => {
    if (supportedImageMimeTypes.has(file.type.toLowerCase())) {
      return Promise.resolve(file);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("invalidFile")); return; }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("invalidFile")); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.92);
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
      const processedFiles: File[] = [];
      for (let file of files) {
        const fileKind = getAiExtractionFileKind(file);
        if (!fileKind) {
          throw new Error("invalidFile");
        }

        // Normalize camera/gallery photos to a clean JPEG MIME type. Phone
        // cameras frequently report nonstandard or empty `file.type` values,
        // which the server's strict MIME allow-list otherwise rejects outright.
        if (fileKind === "image") {
          try {
            file = await normalizeImageMimeType(file);
          } catch {
            throw new Error("invalidFile");
          }
        }

        processedFiles.push(file);
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
