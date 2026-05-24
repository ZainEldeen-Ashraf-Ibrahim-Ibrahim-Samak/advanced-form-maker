"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Copy, QrCode, Download } from "lucide-react";
import { toast } from "sonner";

interface FormShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  formName?: string;
}

export function FormShareDialog({ open, onOpenChange, formId, formName }: FormShareDialogProps) {
  const tc = useTranslations("common");
  const ts = useTranslations("sharing");
  const locale = useLocale();
  const qrRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const shareUrl = origin && formId ? `${origin}/${locale}/f/${formId}` : "";

  function handleCopyShareLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    toast.success(tc("copied"));
  }

  function handleDownloadQR() {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2; // High DPI
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `form-qr-${formId}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success(tc("success"));
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            {ts("title")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-6 py-4">
          <div className="bg-white p-4 rounded-xl shadow-inner border border-zinc-100" ref={qrRef}>
            {shareUrl ? (
              <QRCodeSVG
                value={shareUrl}
                size={200}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/favicon.ico",
                  x: undefined,
                  y: undefined,
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-muted-foreground text-xs">
                {tc("loading")}
              </div>
            )}
          </div>

          <div className="w-full space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider font-bold">
              {ts("publicLink")}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="bg-muted/30 font-mono text-xs overflow-hidden text-ellipsis h-10"
              />
              <Button size="icon" onClick={handleCopyShareLink} disabled={!shareUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="w-full pt-4 border-t flex flex-col gap-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-2 text-sm">
                <QrCode className="h-4 w-4" />
                <span>{ts("qrTitle")}</span>
              </div>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded uppercase">
                {ts("dynamicLink")}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={handleDownloadQR}
              disabled={!shareUrl}
            >
              <Download className="h-4 w-4" />
              {ts("downloadPng")}
            </Button>
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            {tc("close") || "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
