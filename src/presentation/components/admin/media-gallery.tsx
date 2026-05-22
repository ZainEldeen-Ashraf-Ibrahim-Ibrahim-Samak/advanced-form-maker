"use client";

import { useState } from "react";
import { useMediaManager, MediaResource } from "@/presentation/view-models/use-media-manager";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, ExternalLink, Download, Image as ImageIcon, File, RefreshCw, CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { useTranslations } from "next-intl";

export function MediaGallery() {
  const t = useTranslations("media");
  const { resources, isLoading, isPaginating, hasMore, loadMore, deleteMedia, bulkDeleteMedia, refresh } = useMediaManager();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (publicId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) {
        next.delete(publicId);
      } else {
        next.add(publicId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === resources.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(resources.map((r: MediaResource) => r.public_id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(t("deleteConfirm") + ` (${selectedIds.size})`)) return;
    try {
      await bulkDeleteMedia(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch {
      // Handled in view-model
    }
  };

  const handleBulkDownload = () => {
    selectedIds.forEach((id) => {
      const res = resources.find((r: MediaResource) => r.public_id === id);
      if (res) {
        const link = document.createElement("a");
        link.href = res.secure_url.replace("/upload/", "/upload/fl_attachment/");
        link.download = "";
        link.click();
      }
    });
    setSelectedIds(new Set());
  };

  const handleDelete = async (publicId: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await deleteMedia(publicId);
    } catch {
      // errors are handled in the view-model toast flow
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024, dm = 2, sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            {t("title")}
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-md">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {resources.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleSelectAll} 
              className="shrink-0 transition-all duration-300"
            >
              {selectedIds.size === resources.length && resources.length > 0 ? (
                <CheckCircle2 className="h-4 w-4 me-2" />
              ) : (
                <Circle className="h-4 w-4 me-2" />
              )}
              {selectedIds.size === resources.length && resources.length > 0 ? t("unselectAll") : t("selectAll")}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={refresh} 
            className="shrink-0 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            <RefreshCw className="h-4 w-4 me-2" />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {resources.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3">
          <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">{t("noFiles")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {resources.map((res: MediaResource) => (
            <Card 
              key={res.public_id} 
              className={`group relative overflow-hidden transition-all duration-300 ${
                selectedIds.has(res.public_id) 
                  ? "ring-2 ring-primary border-primary shadow-md" 
                  : "border-zinc-200 dark:border-zinc-800 hover:ring-2 hover:ring-primary/20"
              }`}
              onClick={() => toggleSelection(res.public_id)}
            >
              <div 
                className={`absolute top-2 left-2 z-20 transition-opacity duration-300 ${
                  selectedIds.has(res.public_id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                {selectedIds.has(res.public_id) ? (
                  <CheckCircle2 className="w-6 h-6 text-primary fill-white/90 drop-shadow" />
                ) : (
                  <Circle className="w-6 h-6 text-white drop-shadow-md hover:scale-110 transition-transform" />
                )}
              </div>
              <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                {res.resource_type === "image" ? (
                  <Image 
                    src={res.secure_url} 
                    alt={res.public_id} 
                    fill 
                    className={`object-cover transition-transform duration-500 ${!selectedIds.has(res.public_id) && "group-hover:scale-110"}`} 
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <File className={`w-12 h-12 text-zinc-400 transition-transform duration-500 ${!selectedIds.has(res.public_id) && "group-hover:scale-110"}`} />
                )}
                
                {/* Hover overlay with Glassmorphism */}
                <div 
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4 backdrop-blur-[2px]"
                  onClick={(e) => {
                    // Prevent click to let the parent toggle selection handles it unless clicking button
                  }}
                >
                  <div className="flex gap-2">
                    <a 
                      href={res.secure_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center bg-white/20 hover:bg-white/40 h-10 w-10 rounded-full text-white backdrop-blur-md transition-all hover:scale-110"
                      title={t("viewFile") || "View"}
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                    <a 
                      href={res.secure_url.replace("/upload/", "/upload/fl_attachment/")} 
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center bg-white/20 hover:bg-white/40 h-10 w-10 rounded-full text-white backdrop-blur-md transition-all hover:scale-110"
                      title={t("downloadFile") || "Download"}
                      aria-label={t("downloadFile") || "Download"}
                    >
                      <Download className="w-5 h-5" />
                    </a>
                    <button 
                      aria-label={t("deleteFile")}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(res.public_id);
                      }}
                      className="flex items-center justify-center bg-red-500/60 hover:bg-red-600 h-10 w-10 rounded-full text-white backdrop-blur-md transition-all hover:scale-110"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-card border-t">
                <p className="text-xs font-semibold truncate text-foreground" title={res.public_id}>
                  {res.public_id.split("/").pop()}
                </p>
                <div className="flex justify-between items-center mt-2 text-[10px] text-muted-foreground font-mono">
                  <span className="bg-muted px-1.5 py-0.5 rounded uppercase font-bold text-primary/70">{res.format}</span>
                  <span>{formatBytes(res.bytes)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-10 border-t mt-12">
          <Button 
            variant="secondary" 
            onClick={loadMore} 
            disabled={isPaginating}
            className="min-w-[200px] hover:shadow-lg transition-all duration-300 ring-offset-background active:scale-95"
          >
            {isPaginating ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t("loading")}
              </>
            ) : t("loadMore")}
          </Button>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border border-border shadow-xl rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in-0 duration-300 pointer-events-auto">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedIds.size} {t("selected")}
          </span>
          <div className="h-4 w-px bg-border max-sm:hidden" />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="rounded-full">
              {t("cancel")}
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDownload} className="rounded-full">
              <Download className="w-4 h-4 sm:me-2" />
              <span className="hidden sm:inline">{t("downloadFile")}</span>
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="rounded-full">
              <Trash2 className="w-4 h-4 sm:me-2" />
              <span className="hidden sm:inline">{t("deleteFile")}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
