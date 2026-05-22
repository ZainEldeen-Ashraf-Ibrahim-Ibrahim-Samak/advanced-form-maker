import { auth } from "@/lib/auth";
import { MongoFormTemplateRepository } from "@/data/repositories/mongo-form-template-repository";
import { ManageFormsUseCase } from "@/domain/use-cases/admin/manage-forms";
import { createFormTemplateSchema } from "@/lib/validations";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { parseSecureJson } from "@/lib/api-security";

const repo = new MongoFormTemplateRepository();
const useCase = new ManageFormsUseCase(repo);

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const forms = await useCase.listForms();
    return successResponse(forms);
  } catch (error) {
    logger.error("Failed to fetch forms", error);
    return errorResponse("Failed to fetch forms", 500, "FORMS_FETCH_FAILED");
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const parsedBody = await parseSecureJson(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }
    const body = parsedBody.data;
    const parsed = createFormTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 400, "VALIDATION_FAILED", parsed.error.flatten());
    }

    const form = await useCase.createForm(parsed.data);
    return successResponse(form, 201);
  } catch (error) {
    logger.error("Failed to create form", error);
    return errorResponse("Failed to create form", 500, "FORM_CREATE_FAILED");
  }
}
