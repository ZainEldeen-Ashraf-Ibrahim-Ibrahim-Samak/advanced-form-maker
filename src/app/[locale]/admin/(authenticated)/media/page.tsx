import { MediaGallery } from "@/presentation/components/admin/media-gallery";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_ADMIN_NAME } from "@/components/shared/site-name";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("media");
  return {
    title: `${t("title")} — ${SITE_ADMIN_NAME}`,
    description: t("subtitle"),
  };
}

export default function MediaPage() {
  return (
    <div className="w-full">
      <MediaGallery />
    </div>
  );
}
