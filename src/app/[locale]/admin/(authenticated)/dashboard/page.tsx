import { AdminDashboard } from "@/presentation/components/admin/dashboard";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_ADMIN_NAME } from "@/components/shared/site-name";

export async function generateMetadata(): Promise<Metadata> {
  const tDashboard = await getTranslations("dashboard");
  const tNav = await getTranslations("nav");

  return {
    title: `${tNav("dashboard")} — ${SITE_ADMIN_NAME}`,
    description: tDashboard("subtitle"),
  };
}

export default function DashboardPage() {
  return <AdminDashboard />;
}
