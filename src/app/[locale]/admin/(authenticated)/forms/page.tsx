import { FormManager } from "@/presentation/components/admin/form-manager";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteBranding } from "@/components/shared/site-name";

export async function generateMetadata(): Promise<Metadata> {
  const tForms = await getTranslations("forms");
  const branding = await getSiteBranding();

  return {
    title: `${tForms("title")} — ${branding.siteName} Admin`,
    description: tForms("subtitle"),
  };
}

export default function FormsPage() {
  return <FormManager />;
}
