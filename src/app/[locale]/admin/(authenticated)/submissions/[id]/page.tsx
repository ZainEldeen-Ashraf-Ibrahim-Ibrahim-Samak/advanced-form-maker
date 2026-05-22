import { SubmissionReview } from "@/presentation/components/admin/submission-review";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE_ADMIN_NAME } from "@/components/shared/site-name";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("submissions");
  return {
    title: `${t("viewDetail")} — ${SITE_ADMIN_NAME}`,
  };
}

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  return <SubmissionReview id={id} />;
}
