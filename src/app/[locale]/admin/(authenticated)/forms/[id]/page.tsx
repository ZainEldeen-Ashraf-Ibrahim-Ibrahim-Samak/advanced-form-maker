import { FieldBuilder } from "@/presentation/components/admin/field-builder";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getSiteBranding } from "@/components/shared/site-name";
import { getTranslations } from "next-intl/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormAnalysisPanel } from "@/presentation/components/admin/form-analysis";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "forms" });
  const branding = await getSiteBranding();
  return {
    title: `${t("manageForm")} — ${branding.siteName} Admin`,
    description: t("manageFormDesc"),
  };
}

interface FormByIdPageProps {
  params: Promise<{ id: string }>;
}

export default async function FormByIdPage({ params }: FormByIdPageProps) {
  const { id } = await params;
  const t = await getTranslations("forms");
  const tAnalysis = await getTranslations("formAnalysis");

  return (
    <div className="space-y-6">
      <Link href="/admin/forms">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
          {t("backToForms")}
        </Button>
      </Link>
      
      <Tabs defaultValue="fields" className="w-full space-y-6">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="fields">{t("title") || "Form Fields"}</TabsTrigger>
          <TabsTrigger value="analysis">{tAnalysis("title") || "AI Analysis"}</TabsTrigger>
        </TabsList>
        <TabsContent value="fields" className="focus-visible:ring-0 focus-visible:outline-none">
          <FieldBuilder formTemplateId={id} />
        </TabsContent>
        <TabsContent value="analysis" className="focus-visible:ring-0 focus-visible:outline-none">
          <FormAnalysisPanel formId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
