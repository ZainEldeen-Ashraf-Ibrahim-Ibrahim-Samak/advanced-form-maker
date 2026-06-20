"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMediaManager, MediaResource } from "@/presentation/view-models/use-media-manager";
import { Loader2, Check, ImageIcon, RefreshCw } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";



interface MediaSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  currentUrl?: string;
  title?: string;
}

export function MediaSelectorDialog({
  open,
  onOpenChange,
  onSelect,
  currentUrl,
  title,
}: MediaSelectorDialogProps) {
  const t = useTranslations("media");
  const { resources, isLoading, isPaginating, hasMore, loadMore, refresh } = useMediaManager();
  const [selected, setSelected] = useState<string | null>(currentUrl || null);

  const imageResources = resources.filter((r: MediaResource) => r.resource_type === "image");

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setSelected(currentUrl || null);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{title ?? "Choose from Media Library"}</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b shrink-0 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            {isLoading ? t("loading") : t("selectorImageCount", { count: imageResources.length })}
          </p>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 me-1.5", isLoading && "animate-spin")} />
            {t("refresh")}
          </Button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
            </div>
          ) : imageResources.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
              <ImageIcon className="h-12 w-12 opacity-20" />
              <p className="text-sm">{t("noFiles")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {imageResources.map((res: MediaResource) => {
                const isSelected = selected === res.secure_url;
                return (
                  <button
                    key={res.public_id}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : res.secure_url)}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden ring-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-4",
                      isSelected
                        ? "ring-primary shadow-md"
                        : "ring-transparent hover:ring-primary/30",
                    )}
                  >
                    <Image
                      src={res.secure_url}
                      alt={res.public_id.split("/").pop() ?? res.public_id}
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
                        <div className="rounded-full bg-primary p-1 shadow">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center pt-6">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={isPaginating}>
                {isPaginating ? (
                  <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("loading")}</>
                ) : t("loadMore")}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t shrink-0">
          {selected ? (
            <p className="text-xs text-muted-foreground truncate max-w-xs">
              {selected.split("/").pop()}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("selectorNoneSelected")}</p>
          )}
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("selectorCancel")}
            </Button>
            <Button disabled={!selected} onClick={handleConfirm}>
              {t("selectorUseImage")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
