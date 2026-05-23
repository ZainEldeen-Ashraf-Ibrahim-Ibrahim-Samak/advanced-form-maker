"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Camera, RefreshCw, X, Check, Zap, ZapOff, FlipHorizontal, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import { formatFileSize } from "@/lib/utils";

type FacingMode = "user" | "environment";
type FlashMode = "off" | "on";
type CameraState = "idle" | "opening" | "previewing" | "captured" | "uploading";

interface CameraCaptureProps {
  inputId?: string;
  currentUrl?: string | null;
  onUpload: (url: string, publicId: string) => void;
  onRemove: () => void;
  maxFileSize?: number;
  disabled?: boolean;
  hasError?: boolean;
}

export function CameraCapture({
  currentUrl,
  onUpload,
  onRemove,
  maxFileSize = 10,
  disabled = false,
  hasError = false,
}: CameraCaptureProps) {
  const t = useTranslations("client");
  const tc = useTranslations("common");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const [state, setState] = useState<CameraState>("idle");
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchSupported(false);
    setFlashMode("off");
  }, []);

  const revokeCapturedUrl = useCallback(() => {
    setCapturedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCapturedBlob(null);
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
      revokeCapturedUrl();
    };
  }, [stopStream, revokeCapturedUrl]);

  const openCamera = useCallback(
    async (facing: FacingMode = facingMode) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(t("cameraNotSupported"));
        return;
      }
      setCameraError(null);
      setState("opening");
      stopStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });

        if (!mountedRef.current) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const caps = videoTrack.getCapabilities?.() as Record<string, unknown> | undefined;
          setTorchSupported(Boolean(caps?.torch));
        }

        setState("previewing");
      } catch (err) {
        if (!mountedRef.current) return;
        const msg = err instanceof Error ? err.message : "";
        if (/permission|denied|NotAllowed/i.test(msg)) {
          setCameraError(t("cameraPermissionDenied"));
        } else if (/NotFound|Devices|no device/i.test(msg)) {
          setCameraError(t("cameraNotFound"));
        } else {
          setCameraError(t("cameraError"));
        }
        setState("idle");
      }
    },
    [facingMode, stopStream, t]
  );

  const switchCamera = async () => {
    const next: FacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    await openCamera(next);
  };

  const toggleFlash = async () => {
    if (!torchSupported || !streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;
    const next: FlashMode = flashMode === "off" ? "on" : "off";
    try {
      await (videoTrack as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: next === "on" }],
      });
      setFlashMode(next);
    } catch {
      // torch may not be supported on this specific track
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob || !mountedRef.current) return;
        setCapturedBlob(blob);
        setCapturedPreviewUrl(URL.createObjectURL(blob));
        stopStream();
        setState("captured");
      },
      "image/jpeg",
      0.92
    );
  };

  const retake = () => {
    revokeCapturedUrl();
    openCamera(facingMode);
  };

  const uploadPhoto = async () => {
    if (!capturedBlob) return;
    const maxBytes = maxFileSize * 1024 * 1024;
    if (capturedBlob.size > maxBytes) {
      toast.error(t("fileTooLarge", { maxSize: formatFileSize(maxBytes) }));
      return;
    }

    setState("uploading");
    setUploadProgress(0);

    try {
      const file = new File([capturedBlob], `camera_${Date.now()}.jpg`, { type: "image/jpeg" });

      const signRes = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ fieldType: "image", timestamp: Math.round(Date.now() / 1000) }),
      });
      const signData = await signRes.json();
      if (!signRes.ok || !signData.success) throw new Error("Failed to get upload signature");

      const { signature, timestamp: ts, apikey, cloudname, folder, uploadPreset, upload_preset, resourceType, resource_type, eager } = signData.data;
      const resolvedFolder = typeof folder === "string" && folder.trim() ? folder.trim() : "submissions";
      const resolvedPreset = (typeof uploadPreset === "string" && uploadPreset.trim()) ? uploadPreset.trim() : (typeof upload_preset === "string" && upload_preset.trim() ? upload_preset.trim() : "");
      const resolvedResType = (typeof resourceType === "string" && resourceType.trim()) ? resourceType.trim().toLowerCase() : (typeof resource_type === "string" && resource_type.trim() ? resource_type.trim().toLowerCase() : "auto");
      const resolvedEager = typeof eager === "string" ? eager.trim() : "";

      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", apikey);
      fd.append("timestamp", String(ts));
      fd.append("signature", signature);
      fd.append("folder", resolvedFolder);
      if (resolvedPreset) fd.append("upload_preset", resolvedPreset);
      if (resolvedEager) fd.append("eager", resolvedEager);
      fd.append("resource_type", resolvedResType);

      const cloudUrl = `https://api.cloudinary.com/v1_1/${cloudname}/${resolvedResType}/upload`;

      const data: Record<string, unknown> = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", cloudUrl);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && mountedRef.current) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            const parsed = JSON.parse(xhr.responseText) as Record<string, unknown>;
            if (xhr.status >= 200 && xhr.status < 300) resolve(parsed);
            else reject(new Error((parsed.error as { message?: string })?.message || `Upload failed (${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(fd);
      });

      if (data.error) throw new Error((data.error as { message?: string })?.message || t("uploadError"));

      onUpload(data.secure_url as string, data.public_id as string);
      toast.success(t("uploadSuccess"));
      revokeCapturedUrl();
      setState("idle");
    } catch (err) {
      if (!mountedRef.current) return;
      toast.error(err instanceof Error ? err.message : t("uploadError"));
      setState("captured");
    }
  };

  const close = () => {
    stopStream();
    revokeCapturedUrl();
    setState("idle");
    setCameraError(null);
  };

  // ── Existing photo ──────────────────────────────────────────────────────────
  if (currentUrl && state === "idle") {
    return (
      <div className="relative group rounded-xl border bg-muted/30 overflow-hidden w-fit max-w-full">
        <div className="relative h-48 w-48 sm:h-64 sm:w-64">
          <Image src={currentUrl} alt="Captured photo" fill className="object-cover" sizes="256px" />
        </div>
        {!disabled && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
            <Button type="button" size="sm" variant="secondary" className="gap-2 shadow-xl" onClick={() => openCamera()}>
              <Camera className="h-4 w-4" />
              {t("retakePhoto")}
            </Button>
            <Button type="button" size="sm" variant="destructive" className="gap-2 shadow-xl" onClick={onRemove}>
              <X className="h-4 w-4" />
              {tc("delete")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Camera viewfinder / captured preview ────────────────────────────────────
  if (state === "opening" || state === "previewing" || state === "captured" || state === "uploading") {
    return (
      <div className="w-full space-y-2">
        <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden shadow-lg">
          {/* Live video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""} ${state === "captured" || state === "uploading" ? "hidden" : ""}`}
          />

          {/* Captured image */}
          {capturedPreviewUrl && (state === "captured" || state === "uploading") && (
            <Image src={capturedPreviewUrl} alt="Captured" fill className="object-cover" sizes="100vw" unoptimized />
          )}

          {/* Hidden canvas for snapshot */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Opening spinner */}
          {state === "opening" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            </div>
          )}

          {/* Upload overlay */}
          {state === "uploading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3">
              <Loader2 className="h-10 w-10 text-white animate-spin" />
              <div className="w-40 space-y-1 text-center">
                <progress
                  max={100}
                  value={uploadProgress}
                  className="w-full h-1.5 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-white/30 [&::-webkit-progress-value]:bg-white [&::-moz-progress-bar]:bg-white"
                />
                <span className="text-white text-xs font-medium">{uploadProgress}%</span>
              </div>
            </div>
          )}

          {/* Top controls (previewing) */}
          {state === "previewing" && (
            <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                onClick={toggleFlash}
                title={flashMode === "on" ? t("flashOff") : t("flashOn")}
                disabled={!torchSupported}
              >
                {flashMode === "on" ? (
                  <Zap className="h-5 w-5 text-yellow-400" />
                ) : (
                  <ZapOff className={`h-5 w-5 ${torchSupported ? "" : "opacity-30"}`} />
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                onClick={close}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Bottom controls (previewing) */}
          {state === "previewing" && (
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-8 z-10">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                onClick={switchCamera}
                title={t("switchCamera")}
              >
                <FlipHorizontal className="h-5 w-5" />
              </Button>

              {/* Shutter */}
              <button
                type="button"
                onClick={takePhoto}
                className="h-16 w-16 rounded-full bg-white shadow-lg hover:scale-95 active:scale-90 transition-transform flex items-center justify-center ring-4 ring-white/40"
                aria-label={t("takePhoto")}
              >
                <div className="h-12 w-12 rounded-full bg-white border-[3px] border-black/15" />
              </button>

              {/* Spacer */}
              <div className="h-11 w-11" />
            </div>
          )}

          {/* Bottom controls (captured) */}
          {state === "captured" && (
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 z-10">
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-full bg-black/60 text-white hover:bg-black/80 gap-2 px-5 backdrop-blur-sm"
                onClick={retake}
              >
                <RefreshCw className="h-4 w-4" />
                {t("retakePhoto")}
              </Button>
              <Button
                type="button"
                className="h-11 rounded-full bg-white text-black hover:bg-white/90 gap-2 px-5 shadow-lg"
                onClick={uploadPhoto}
              >
                <Check className="h-4 w-4" />
                {t("usePhoto")}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Idle: open-camera button ─────────────────────────────────────────────────
  return (
    <div className="w-full space-y-2">
      {cameraError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {cameraError}
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => openCamera()}
        className={`
          w-full h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-all
          ${disabled ? "opacity-50 cursor-not-allowed bg-muted/10 border-muted-foreground/20" : "cursor-pointer hover:border-primary/50 hover:bg-muted/40"}
          ${hasError ? "border-destructive" : "border-muted-foreground/30"}
        `}
      >
        <div className={`p-3 rounded-full ${hasError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          <Camera className="h-7 w-7" />
        </div>
        <div className="text-center">
          <span className="text-sm font-semibold text-foreground block">{t("openCamera")}</span>
          <span className="text-xs text-muted-foreground block mt-0.5">{t("tapToOpenCamera")}</span>
        </div>
      </button>
    </div>
  );
}
