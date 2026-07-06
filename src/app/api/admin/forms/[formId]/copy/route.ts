import { auth } from "@/lib/auth";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { MongoFormTemplateRepository } from "@/data/repositories/mongo-form-template-repository";
import { MongoFieldDefinitionRepository } from "@/data/repositories/mongo-field-definition-repository";
import { MongoDashboardCardRepository } from "@/data/repositories/mongo-dashboard-card-repository";
import { ManageFormsUseCase } from "@/domain/use-cases/admin/manage-forms";

const formRepo = new MongoFormTemplateRepository();
const fieldRepo = new MongoFieldDefinitionRepository();
const cardRepo = new MongoDashboardCardRepository();
const formsUseCase = new ManageFormsUseCase(formRepo, cardRepo);

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ formId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const { formId } = await params;

    const sourceForm = await formsUseCase.getForm(formId);
    if (!sourceForm) {
      return errorResponse("Form not found", 404, "NOT_FOUND");
    }

    const sourceFields = await fieldRepo.findByFormId(formId, false);

    // Create the new form with " - copy" appended to the name
    const newForm = await formsUseCase.createForm({
      name: `${sourceForm.name} - copy`,
      description: sourceForm.description,
      aiAutoFillEnabled: sourceForm.aiAutoFillEnabled,
      isContactForm: sourceForm.isContactForm,
    });

    // Copy all form settings (contact fields, contact records, locks, etc.)
    await formsUseCase.updateForm(newForm.id, {
      contactRecords: sourceForm.contactRecords,
      contactFormFields: sourceForm.contactFormFields,
      contactFormLocked: sourceForm.contactFormLocked,
      canAddMoreReplies: sourceForm.canAddMoreReplies,
      multiInstanceEnabled: sourceForm.multiInstanceEnabled,
      maxInstances: sourceForm.maxInstances,
      isLocked: false, // new copy starts unlocked
    });

    // Copy all field definitions preserving sort order
    for (const field of sourceFields) {
      await fieldRepo.create({
        formTemplateId: newForm.id,
        nameEn: field.nameEn,
        nameAr: field.nameAr,
        inputType: field.inputType,
        validationRules: field.validationRules,
        isMultiple: field.isMultiple,
        dropdownOptionsEn: field.dropdownOptionsEn,
        dropdownOptionsAr: field.dropdownOptionsAr,
        defaultValue: field.defaultValue,
        sortOrder: field.sortOrder,
      });
    }

    return successResponse(newForm, 201);
  } catch (error) {
    logger.error("Failed to copy form", error);
    return errorResponse("Failed to copy form", 500, "FORM_COPY_FAILED");
  }
}
