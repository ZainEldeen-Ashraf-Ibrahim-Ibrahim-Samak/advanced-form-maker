import { FieldBuilder } from "@/presentation/components/admin/field-builder";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getSiteBranding } from "@/components/shared/site-name";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getSiteBranding();
  return {
    title: `Field Builder — ${branding.siteName} Admin`,
    description: "Define fields for your data collection form",
  };
}

interface FieldsPageProps {
  params: Promise<{ id: string }>;
}

export default async function FieldsPage({ params }: FieldsPageProps) {
  const { id } = await params;
  const t = await getTranslations("forms");

  return (
    <div className="space-y-4">
      <Link href="/admin/forms">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
          {t("backToForms")}
        </Button>
      </Link>
      <FieldBuilder formTemplateId={id} />
    </div>
  );
}
