import { auth } from "@/lib/auth";
import { MongoFormTemplateRepository } from "@/data/repositories/mongo-form-template-repository";
import { MongoDashboardCardRepository } from "@/data/repositories/mongo-dashboard-card-repository";
import { ManageFormsUseCase } from "@/domain/use-cases/admin/manage-forms";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { parseSecureJson } from "@/lib/api-security";
import { z } from "zod";

const repo = new MongoFormTemplateRepository();
const cardRepo = new MongoDashboardCardRepository();
const useCase = new ManageFormsUseCase(repo, cardRepo);

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ formId: string }>;
}

const lockSchema = z.object({
  isLocked: z.boolean(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return unauthorizedResponse();
  }

  try {
    const { formId } = await params;
    const parsedBody = await parseSecureJson(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }
    const body = parsedBody.data;
    const parsed = lockSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 400, "VALIDATION_FAILED", parsed.error.flatten());
    }

    const form = await useCase.lockForm(formId, parsed.data.isLocked);
    return successResponse({ id: form.id, isLocked: form.isLocked });
  } catch (error: any) {
    logger.error("Failed to toggle form lock", error);
    if (error.message === "Form template not found") {
      return errorResponse("Form not found", 404, "NOT_FOUND");
    }
    return errorResponse("Failed to toggle form lock", 500, "FORM_LOCK_FAILED");
  }
}
