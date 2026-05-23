import { SubmissionReview } from "@/presentation/components/admin/submission-review";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSiteBranding } from "@/components/shared/site-name";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("submissions");
  const branding = await getSiteBranding();
  return {
    title: `${t("viewDetail")} — ${branding.siteName} Admin`,
  };
}

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  return <SubmissionReview id={id} />;
}
