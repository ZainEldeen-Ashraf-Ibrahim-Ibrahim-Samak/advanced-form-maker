import { SettingsForm } from "@/presentation/components/admin/settings-form";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteBranding } from "@/components/shared/site-name";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminSettings");
  const branding = await getSiteBranding();
  return {
    title: `${t("title")} — ${branding.siteName} Admin`,
    description: t("subtitle"),
  };
}

export default function SettingsPage() {
  return (
    <div className="w-full">
      <SettingsForm />
    </div>
  );
}
