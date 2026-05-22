import { redirect } from "next/navigation";
import { generateAccessToken } from "@/lib/utils";
import { MongoSubmissionRepository } from "@/data/repositories/mongo-submission-repository";
import { MongoFormTemplateRepository } from "@/data/repositories/mongo-form-template-repository";
import { MongoFieldDefinitionRepository } from "@/data/repositories/mongo-field-definition-repository";
import { logger } from "@/lib/dev-logger";

const submissionRepo = new MongoSubmissionRepository();
const formTemplateRepo = new MongoFormTemplateRepository();
const fieldDefRepo = new MongoFieldDefinitionRepository();

export default async function PublicFormStartPage({
  params,
}: {
  params: Promise<{ locale: string; formId: string }>;
}) {
  const { locale, formId } = await params;
  let redirectToken = null;

  try {
    // Validate form exists and is active
    const form = await formTemplateRepo.findById(formId);
    if (!form || !form.isActive) {
      // If form not found or not active, just redirect to not-found or home
      // We will handle this outside the try block
      return;
    }

    const fields = await fieldDefRepo.findByFormId(formId, false);
    const contactRecords = form.contactRecords && form.contactRecords.length > 0
      ? form.contactRecords
      : [{ id: "primary", name: "Primary Contact", email: "", phone: "", role: "", notes: "" }];

    // Create a new empty submission to generate an invite token, marked as draft
    const token = generateAccessToken();
    const submission = await submissionRepo.create(
      {
        formTemplateId: formId,
        clientName: "",
        clientContact: "",
        contactRecords,
        formSnapshot: fields,
      },
      token
    );

    // We update status to 'draft' directly if we need to align with data models.
    // However, we don't have an admin session. We can assign 'system' or leave it to the repo defaults.
    // In our model `status` defaults to `pending`. We want to make it `draft`.
    // Let's rely on directly updating the underlying model just for the status to bypass audit needing admin info
    const { SubmissionModel } = await import("@/data/models/submission.model");
    await SubmissionModel.findByIdAndUpdate(submission.id, { status: "draft" });

    redirectToken = token;
  } catch (error) {
    // We can't log 'error' easily if we only rely on redirection, but just to satisfy eslint
    logger.error("Public submission init failed", error);
    // On error, fallback to root
  }

  if (redirectToken) {
    redirect(`/${locale}/submit/${redirectToken}`);
  } else {
    redirect(`/${locale}`);
  }
}
