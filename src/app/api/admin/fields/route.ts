import { auth } from "@/lib/auth";
import { MongoFieldDefinitionRepository } from "@/data/repositories/mongo-field-definition-repository";
import { ManageFieldsUseCase } from "@/domain/use-cases/admin/manage-fields";
import { createFieldDefinitionSchema } from "@/lib/validations";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { parseSecureJson } from "@/lib/api-security";

const repo = new MongoFieldDefinitionRepository();
const useCase = new ManageFieldsUseCase(repo);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const formTemplateId = searchParams.get("formTemplateId");
    const includeInactive = searchParams.get("includeInactive") === "true";

    if (!formTemplateId) {
      return errorResponse("formTemplateId is required", 400, "BAD_REQUEST");
    }

    const fields = await useCase.listFields(formTemplateId, includeInactive);
    return successResponse(fields);
  } catch (error) {
    logger.error("Failed to fetch fields", error);
    return errorResponse("Failed to fetch fields", 500, "FIELDS_FETCH_FAILED");
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
    const parsed = createFieldDefinitionSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 400, "VALIDATION_FAILED", parsed.error.flatten());
    }

    const field = await useCase.createField(parsed.data);
    return successResponse(field, 201);
  } catch (error) {
    logger.error("Failed to create field", error);
    return errorResponse("Failed to create field", 500, "FIELD_CREATE_FAILED");
  }
}
