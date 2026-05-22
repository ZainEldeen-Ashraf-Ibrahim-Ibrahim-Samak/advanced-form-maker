import { auth } from "@/lib/auth";
import { MongoFieldDefinitionRepository } from "@/data/repositories/mongo-field-definition-repository";
import { ManageFieldsUseCase } from "@/domain/use-cases/admin/manage-fields";
import { updateFieldDefinitionSchema } from "@/lib/validations";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { parseSecureJson } from "@/lib/api-security";

const repo = new MongoFieldDefinitionRepository();
const useCase = new ManageFieldsUseCase(repo);

interface RouteParams {
  params: Promise<{ fieldId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const { fieldId } = await params;
    const parsedBody = await parseSecureJson(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }
    const body = parsedBody.data;
    const parsed = updateFieldDefinitionSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 400, "VALIDATION_FAILED", parsed.error.flatten());
    }

    const field = await useCase.updateField(fieldId, parsed.data);
    if (!field) {
      return errorResponse("Field not found", 404, "NOT_FOUND");
    }
    return successResponse(field);
  } catch (error) {
    logger.error("Failed to update field", error);
    return errorResponse("Failed to update field", 500, "FIELD_UPDATE_FAILED");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const { fieldId } = await params;
    const deleted = await useCase.deleteField(fieldId);
    if (!deleted) {
      return errorResponse("Field not found", 404, "NOT_FOUND");
    }
    return successResponse({ message: "Field deactivated successfully" });
  } catch (error) {
    logger.error("Failed to delete field", error);
    return errorResponse("Failed to delete field", 500, "FIELD_DELETE_FAILED");
  }
}
