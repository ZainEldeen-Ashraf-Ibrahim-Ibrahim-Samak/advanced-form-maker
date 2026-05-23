import { AdminDashboard } from "@/presentation/components/admin/dashboard";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteBranding } from "@/components/shared/site-name";

export async function generateMetadata(): Promise<Metadata> {
  const tDashboard = await getTranslations("dashboard");
  const tNav = await getTranslations("nav");
  const branding = await getSiteBranding();

  return {
    title: `${tNav("dashboard")} — ${branding.siteName} Admin`,
    description: tDashboard("subtitle"),
  };
}

export default function DashboardPage() {
  return <AdminDashboard />;
}
