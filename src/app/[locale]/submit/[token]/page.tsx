import { SubmissionForm } from "@/presentation/components/client/submission-form";
import { ClientNotifications } from "@/presentation/components/client/notifications";
import type { Metadata } from "next";
import { getSiteBranding } from "@/components/shared/site-name";

import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string; locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "client" });
  const branding = await getSiteBranding();
  return {
    title: `${t("formTitle")} — ${branding.siteName}`,
  };
}

interface SubmitPageProps {
  params: Promise<{ token: string }>;
}

export default async function SubmitPage({ params }: SubmitPageProps) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-background px-3 pt-3 pb-10 sm:px-4 sm:pt-4 sm:pb-12">
      <ClientNotifications token={token} />
      <SubmissionForm tokenOrId={token} />
    </div>
  );
}
