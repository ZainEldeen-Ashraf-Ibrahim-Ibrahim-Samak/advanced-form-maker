import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export interface MediaResource {
  public_id: string;
  format: string;
  version: number;
  resource_type: string;
  type: string;
  created_at: string;
  bytes: number;
  width: number;
  height: number;
  url: string;
  secure_url: string;
}

export function useMediaManager() {
  const t = useTranslations("media");
  const [resources, setResources] = useState<MediaResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaginating, setIsPaginating] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchMedia = useCallback(async (cursor?: string) => {
    try {
      if (cursor) {
        setIsPaginating(true);
      } else {
        setIsLoading(true);
      }
      const url = cursor ? `/api/admin/media?cursor=${encodeURIComponent(cursor)}` : "/api/admin/media";
      const res = await fetch(url);
      if (!res.ok) throw new Error(t("loadError"));
      const json = await res.json();
      
      if (!json.success) throw new Error(json.error);
      
      if (cursor) {
        setResources(prev => [...prev, ...json.data.resources]);
      } else {
        setResources(json.data.resources);
      }

      setNextCursor(json.data.next_cursor || null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("loadError");
      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsPaginating(false);
    }
  }, [t]);

  const loadMore = () => {
    if (nextCursor) {
      fetchMedia(nextCursor);
    }
  };

  const deleteMedia = async (publicId: string, showToast = true) => {
    let toastId;
    if (showToast) toastId = toast.loading(t("deleting"));
    try {
      const res = await fetch(`/api/admin/media?publicId=${encodeURIComponent(publicId)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error(t("deleteError"));
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setResources(prev => prev.filter(r => r.public_id !== publicId));
      if (showToast) toast.success(t("deleteSuccess"), { id: toastId });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("deleteError");
      if (showToast) toast.error(message, { id: toastId });
      throw e;
    }
  };

  const bulkDeleteMedia = async (publicIds: string[]) => {
    const toastId = toast.loading(t("deleting") + ` (${publicIds.length})`);
    try {
      await Promise.all(publicIds.map(id => deleteMedia(id, false)));
      toast.success(t("deleteSuccess"), { id: toastId });
    } catch (e: unknown) {
      toast.error(t("deleteError"), { id: toastId });
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  return {
    resources,
    isLoading,
    isPaginating,
    hasMore: !!nextCursor,
    loadMore,
    deleteMedia,
    bulkDeleteMedia,
    refresh: () => fetchMedia()
  };
}
