import { SubmissionsManager } from "@/presentation/components/admin/submissions-manager";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("submissions");
  return {
    title: t("title"),
  };
}

export default async function SubmissionsPage() {
  return <SubmissionsManager />;
}
