import React, { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Camera, UploadCloud, Sparkles, Loader2 } from "lucide-react";
import { ExtractionStage } from "@/presentation/view-models/use-ai-extraction";

interface AiPhotoUploadProps {
  stage: ExtractionStage;
  isExtracting: boolean;
  elapsedSeconds: number;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
  locale: "en" | "ar";
}

export function AiPhotoUpload({
  stage,
  isExtracting,
  elapsedSeconds,
  disabled = false,
  onFileSelected,
  locale,
}: AiPhotoUploadProps) {
  const t = useTranslations("aiExtraction");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isExtracting) return;

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || isExtracting) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isExtracting) return;
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    if (disabled || isExtracting) return;
    fileInputRef.current?.click();
  };

  // Stage indicator rendering helper
  const getStageLabel = () => {
    switch (stage) {
      case "uploading":
        return locale === "ar" ? "جاري رفع الصورة..." : "Uploading image...";
      case "analyzing":
        return t("analyzing");
      case "extracting":
        return locale === "ar" ? "جاري استخراج البيانات..." : "Extracting data...";
      default:
        return t("analyzing");
    }
  };

  return (
    <div className="w-full mb-6">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFileChange}
        disabled={disabled || isExtracting}
      />

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden
          ${dragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-muted-foreground/30 bg-muted/20 hover:bg-muted/45 hover:border-primary/50"}
          ${isExtracting ? "pointer-events-none border-primary bg-primary/5" : ""}
          ${disabled ? "opacity-60 cursor-not-allowed bg-muted/10 border-muted-foreground/20" : "cursor-pointer"}
        `}
        onClick={onButtonClick}
      >
        {/* Animated Shimmer Background during processing */}
        {isExtracting && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full animate-shimmer" />
        )}

        {isExtracting ? (
          <div className="flex flex-col items-center gap-4 z-10">
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping duration-1000 h-16 w-16" />
              <div className="relative p-4 rounded-full bg-background shadow-md flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold text-lg text-foreground animate-pulse">
                {getStageLabel()}
              </h4>
              
              {/* Multi-step pipeline visualizer */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
                <span className={stage === "uploading" ? "text-primary font-medium" : "text-muted-foreground/60"}>
                  {locale === "ar" ? "الرفع" : "Upload"}
                </span>
                <span>•</span>
                <span className={stage === "analyzing" ? "text-primary font-medium" : "text-muted-foreground/60"}>
                  {locale === "ar" ? "التحليل" : "Analyze"}
                </span>
                <span>•</span>
                <span className={stage === "extracting" ? "text-primary font-medium" : "text-muted-foreground/60"}>
                  {locale === "ar" ? "الاستخراج" : "Extract"}
                </span>
              </div>

              {/* Elapsed time warning for longer loads */}
              {elapsedSeconds >= 5 && (
                <p className="text-xs text-amber-500 font-medium animate-pulse mt-2">
                  {locale === "ar"
                    ? `ما زلنا نحلل... (${elapsedSeconds} ثوانٍ)`
                    : `Still analyzing... (${elapsedSeconds} seconds)`}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 z-10">
            <div className="p-4 rounded-full bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
              <Camera className="h-8 w-8" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-semibold text-lg text-foreground flex items-center justify-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                {t("uploadTitle")}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t("uploadDescription")}
              </p>
            </div>

            <button
              type="button"
              disabled={disabled}
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              <UploadCloud className="inset-s-0 h-4 w-4 margin-e-2" />
              {t("uploadButton")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
