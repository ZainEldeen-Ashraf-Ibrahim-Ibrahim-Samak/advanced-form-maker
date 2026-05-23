import { MediaGallery } from "@/presentation/components/admin/media-gallery";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteBranding } from "@/components/shared/site-name";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("media");
  const branding = await getSiteBranding();
  return {
    title: `${t("title")} — ${branding.siteName} Admin`,
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
