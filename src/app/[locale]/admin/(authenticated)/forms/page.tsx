import { FormManager } from "@/presentation/components/admin/form-manager";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_ADMIN_NAME } from "@/components/shared/site-name";

export async function generateMetadata(): Promise<Metadata> {
  const tForms = await getTranslations("forms");

  return {
    title: `${tForms("title")} — ${SITE_ADMIN_NAME}`,
    description: tForms("subtitle"),
  };
}

export default function FormsPage() {
  return <FormManager />;
}
