import React, { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Camera, UploadCloud, Sparkles, Loader2, X, FlipHorizontal, Zap, ZapOff } from "lucide-react";
import { ExtractionStage } from "@/presentation/view-models/use-ai-extraction";
import { Button } from "@/components/ui/button";

type FacingMode = "user" | "environment";
type FlashMode = "off" | "on";
type CamState = "closed" | "opening" | "previewing" | "captured";

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
  const tc = useTranslations("client");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Camera state ─────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const [camState, setCamState] = useState<CamState>("closed");
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [torchSupported, setTorchSupported] = useState(false);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setTorchSupported(false);
    setFlashMode("off");
  }, []);

  const revokeCapture = useCallback(() => {
    setCapturedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCapturedBlob(null);
  }, []);

  const openCamera = useCallback(
    async (facing: FacingMode = facingMode) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError(locale === "ar" ? "الكاميرا غير مدعومة في هذا المتصفح" : "Camera not supported in this browser");
        return;
      }
      setCamError(null);
      setCamState("opening");
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as Record<string, unknown> | undefined;
        setTorchSupported(Boolean(caps?.torch));
        setCamState("previewing");
      } catch (err) {
        if (!mountedRef.current) return;
        const msg = err instanceof Error ? err.message : "";
        if (/permission|denied|NotAllowed/i.test(msg)) {
          setCamError(locale === "ar" ? "تم رفض إذن الكاميرا" : "Camera permission denied");
        } else if (/NotFound|Devices/i.test(msg)) {
          setCamError(locale === "ar" ? "لا توجد كاميرا على هذا الجهاز" : "No camera found on this device");
        } else {
          setCamError(locale === "ar" ? "تعذر فتح الكاميرا" : "Could not open camera");
        }
        setCamState("closed");
      }
    },
    [facingMode, stopStream, locale]
  );

  const switchCamera = async () => {
    const next: FacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    await openCamera(next);
  };

  const toggleFlash = async () => {
    if (!torchSupported || !streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const next: FlashMode = flashMode === "off" ? "on" : "off";
    try {
      await (track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: next === "on" }],
      });
      setFlashMode(next);
    } catch { /* torch not available */ }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facingMode === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob || !mountedRef.current) return;
      setCapturedBlob(blob);
      setCapturedPreviewUrl(URL.createObjectURL(blob));
      stopStream();
      setCamState("captured");
    }, "image/jpeg", 0.92);
  };

  const retakePhoto = () => {
    revokeCapture();
    openCamera(facingMode);
  };

  const usePhoto = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `ai_capture_${Date.now()}.jpg`, { type: "image/jpeg" });
    revokeCapture();
    setCamState("closed");
    onFileSelected(file);
  };

  const closeCamera = () => {
    stopStream();
    revokeCapture();
    setCamState("closed");
    setCamError(null);
  };

  // ── File upload handlers ──────────────────────────────────────────────────────
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isExtracting) return;
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || isExtracting) return;
    if (e.dataTransfer.files?.[0]) onFileSelected(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isExtracting) return;
    if (e.target.files?.[0]) onFileSelected(e.target.files[0]);
  };

  const getStageLabel = () => {
    switch (stage) {
      case "uploading": return locale === "ar" ? "جاري رفع الصورة..." : "Uploading image...";
      case "analyzing": return t("analyzing");
      case "extracting": return locale === "ar" ? "جاري استخراج البيانات..." : "Extracting data...";
      default: return t("analyzing");
    }
  };

  // ── Camera viewfinder ─────────────────────────────────────────────────────────
  if (camState !== "closed") {
    return (
      <div className="w-full mb-6 space-y-2">
        {camError && (
          <p className="text-sm text-destructive">{camError}</p>
        )}
        <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden shadow-lg">
          {/* Live video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""} ${camState === "captured" ? "hidden" : ""}`}
          />

          {/* Captured preview */}
          {capturedPreviewUrl && camState === "captured" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedPreviewUrl} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
          )}

          {/* Hidden canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Opening spinner */}
          {camState === "opening" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            </div>
          )}

          {/* Top controls */}
          {camState === "previewing" && (
            <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!torchSupported}
                onClick={toggleFlash}
                className="h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70"
                title={flashMode === "on" ? (locale === "ar" ? "إطفاء الفلاش" : "Flash Off") : (locale === "ar" ? "تشغيل الفلاش" : "Flash On")}
              >
                {flashMode === "on"
                  ? <Zap className="h-5 w-5 text-yellow-400" />
                  : <ZapOff className={`h-5 w-5 ${torchSupported ? "" : "opacity-30"}`} />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeCamera}
                className="h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Bottom controls — previewing */}
          {camState === "previewing" && (
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-8 z-10">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={switchCamera}
                className="h-11 w-11 rounded-full bg-black/50 text-white hover:bg-black/70"
                title={locale === "ar" ? "تبديل الكاميرا" : "Switch Camera"}
              >
                <FlipHorizontal className="h-5 w-5" />
              </Button>

              {/* Shutter */}
              <button
                type="button"
                onClick={takePhoto}
                className="h-16 w-16 rounded-full bg-white shadow-lg ring-4 ring-white/40 hover:scale-95 active:scale-90 transition-transform flex items-center justify-center"
                aria-label={locale === "ar" ? "التقاط صورة" : "Take Photo"}
              >
                <div className="h-12 w-12 rounded-full bg-white border-[3px] border-black/15" />
              </button>

              <div className="h-11 w-11" />
            </div>
          )}

          {/* Bottom controls — captured */}
          {camState === "captured" && (
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 z-10">
              <Button
                type="button"
                variant="ghost"
                onClick={retakePhoto}
                className="h-11 rounded-full bg-black/60 text-white hover:bg-black/80 gap-2 px-5"
              >
                <FlipHorizontal className="h-4 w-4" />
                {locale === "ar" ? "إعادة التقاط" : "Retake"}
              </Button>
              <Button
                type="button"
                onClick={usePhoto}
                className="h-11 rounded-full bg-white text-black hover:bg-white/90 gap-2 px-5 shadow-lg"
              >
                <Sparkles className="h-4 w-4" />
                {locale === "ar" ? "استخدم هذه الصورة" : "Use This Photo"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main upload / idle UI ─────────────────────────────────────────────────────
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
        onClick={() => { if (!disabled && !isExtracting) fileInputRef.current?.click(); }}
      >
        {/* Shimmer while processing */}
        {isExtracting && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full animate-shimmer" />
        )}

        {isExtracting ? (
          <div className="flex flex-col items-center gap-4 z-10">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping duration-1000 h-16 w-16" />
              <div className="relative p-4 rounded-full bg-background shadow-md flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-lg text-foreground animate-pulse">{getStageLabel()}</h4>
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
              {elapsedSeconds >= 5 && (
                <p className="text-xs text-amber-500 font-medium animate-pulse mt-2">
                  {locale === "ar" ? `ما زلنا نحلل... (${elapsedSeconds} ثوانٍ)` : `Still analyzing... (${elapsedSeconds} seconds)`}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 z-10">
            <div className="p-4 rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg text-foreground flex items-center justify-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                {t("uploadTitle")}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">{t("uploadDescription")}</p>
            </div>

            {/* Two action buttons */}
            <div className="flex items-center gap-3 mt-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors gap-2"
              >
                <UploadCloud className="h-4 w-4" />
                {t("uploadButton")}
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => openCamera()}
                className="inline-flex items-center justify-center rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary shadow hover:bg-primary/20 transition-colors gap-2"
              >
                <Camera className="h-4 w-4" />
                {locale === "ar" ? "التقاط صورة" : "Take Photo"}
              </button>
            </div>

            {camError && (
              <p className="text-xs text-destructive mt-1">{camError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
