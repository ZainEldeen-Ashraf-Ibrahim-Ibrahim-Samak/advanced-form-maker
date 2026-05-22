import { auth } from "@/lib/auth";
import { MongoFormTemplateRepository } from "@/data/repositories/mongo-form-template-repository";
import { ManageFormsUseCase } from "@/domain/use-cases/admin/manage-forms";
import { updateFormTemplateSchema } from "@/lib/validations";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { NotificationPublisher } from "@/lib/events/publisher";
import { parseSecureJson } from "@/lib/api-security";

const repo = new MongoFormTemplateRepository();
const useCase = new ManageFormsUseCase(repo);

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ formId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const { formId } = await params;
    const form = await useCase.getForm(formId);
    if (!form) {
      return errorResponse("Form not found", 404, "NOT_FOUND");
    }
    return successResponse(form);
  } catch (error) {
    logger.error("Failed to fetch form", error);
    return errorResponse("Failed to fetch form", 500, "FORM_FETCH_FAILED");
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const { formId } = await params;
    const parsedBody = await parseSecureJson(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }
    const body = parsedBody.data;
    const parsed = updateFormTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 400, "VALIDATION_FAILED", parsed.error.flatten());
    }

    const form = await useCase.updateForm(formId, parsed.data);
    if (!form) {
      return errorResponse("Form not found", 404, "NOT_FOUND");
    }

    if (parsed.data.contactFormFields || parsed.data.contactRecords) {
      await NotificationPublisher.notifyContactFormUpdated(form.id);
    }

    return successResponse(form);
  } catch (error) {
    logger.error("Failed to update form", error);
    return errorResponse("Failed to update form", 500, "FORM_UPDATE_FAILED");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const { formId } = await params;
    const result = await useCase.deleteForm(formId);
    if (!result.success) {
      return errorResponse(result.error ?? "Failed to delete form", 400, "FORM_DELETE_FAILED");
    }
    return successResponse({ message: "Form deleted" });
  } catch (error) {
    logger.error("Failed to delete form", error);
    return errorResponse("Failed to delete form", 500, "FORM_DELETE_FAILED");
  }
}
