import { auth } from "@/lib/auth";
import { MongoDashboardCardRepository } from "@/data/repositories/mongo-dashboard-card-repository";
import { MongoFormTemplateRepository } from "@/data/repositories/mongo-form-template-repository";
import { ManageDashboardCardsUseCase } from "@/domain/use-cases/admin/manage-dashboard-cards";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { parseSecureJson } from "@/lib/api-security";
import { z } from "zod";

const cardRepo = new MongoDashboardCardRepository();
const formRepo = new MongoFormTemplateRepository();
const useCase = new ManageDashboardCardsUseCase(cardRepo, formRepo);

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return unauthorizedResponse();
  }

  try {
    const cards = await useCase.listCardsWithFormData();
    return successResponse(cards);
  } catch (error) {
    logger.error("Failed to fetch dashboard cards", error);
    return errorResponse("Failed to fetch dashboard cards", 500, "CARDS_FETCH_FAILED");
  }
}

const updateCardSchema = z.object({
  formTemplateId: z.string(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  displayName: z.string().nullable().optional(),
  metricLabel: z.string().nullable().optional(),
  metricValue: z.string().nullable().optional(),
});

const updateCardsSchema = z.array(updateCardSchema);

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return unauthorizedResponse();
  }

  try {
    const parsedBody = await parseSecureJson(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }
    const body = parsedBody.data;
    const parsed = updateCardsSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 400, "VALIDATION_FAILED", parsed.error.flatten());
    }

    await useCase.saveCardConfig(parsed.data);
    const updatedCards = await useCase.listCardsWithFormData();
    return successResponse(updatedCards);
  } catch (error) {
    logger.error("Failed to update dashboard cards config", error);
    return errorResponse("Failed to update dashboard cards config", 500, "CARDS_UPDATE_FAILED");
  }
}
