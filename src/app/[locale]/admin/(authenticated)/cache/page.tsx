import { getTranslations } from "next-intl/server";
import { CacheManager } from "@/presentation/components/admin/cache-manager";
export async function generateMetadata() {
  const t = await getTranslations("cache");
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function CachePage() {
  const t = await getTranslations("cache");

  return (
    <div className="container py-8 max-w-5xl mx-auto px-4 md:px-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>
      
      <div className="mt-6">
        <CacheManager />
      </div>
    </div>
  );
}
