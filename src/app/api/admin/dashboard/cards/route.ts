import { auth } from "@/lib/auth";
import { MongoDashboardCardRepository } from "@/data/repositories/mongo-dashboard-card-repository";
import { MongoFormTemplateRepository } from "@/data/repositories/mongo-form-template-repository";
import { MongoStatCardConfigRepository } from "@/data/repositories/mongo-stat-card-config-repository";
import { ManageDashboardCardsUseCase } from "@/domain/use-cases/admin/manage-dashboard-cards";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { parseSecureJson } from "@/lib/api-security";
import { z } from "zod";

const cardRepo = new MongoDashboardCardRepository();
const formRepo = new MongoFormTemplateRepository();
const statCardRepo = new MongoStatCardConfigRepository();
const useCase = new ManageDashboardCardsUseCase(cardRepo, formRepo, statCardRepo);

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

const formCardSchema = z.object({
  cardType: z.literal("form"),
  formTemplateId: z.string(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  displayNameAr: z.string().nullable().optional(),
  displayNameEn: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  metricLabel: z.string().nullable().optional(),
  metricValue: z.string().nullable().optional(),
});

const statCardSchema = z.object({
  cardType: z.literal("stat"),
  slug: z.string(),
  visible: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  displayNameAr: z.string().nullable().optional(),
  displayNameEn: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  metricLabel: z.string().nullable().optional(),
  metricValue: z.string().nullable().optional(),
});

const updateCardSchema = z.discriminatedUnion("cardType", [
  formCardSchema,
  statCardSchema,
]);

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

const createStatCardSchema = z.object({
  displayNameEn: z.string().min(1),
  displayNameAr: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return unauthorizedResponse();
  }

  try {
    const parsedBody = await parseSecureJson(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }
    const parsed = createStatCardSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, "VALIDATION_FAILED", parsed.error.flatten());
    }

    const card = await useCase.addCustomStatCard(parsed.data.displayNameEn, parsed.data.displayNameAr);
    const allCards = await useCase.listCardsWithFormData();
    return successResponse({ card, allCards });
  } catch (error) {
    logger.error("Failed to create custom stat card", error);
    return errorResponse("Failed to create custom stat card", 500, "CARD_CREATE_FAILED");
  }
}

const deleteStatCardSchema = z.object({
  slug: z.string(),
});

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return unauthorizedResponse();
  }

  try {
    const parsedBody = await parseSecureJson(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }
    const parsed = deleteStatCardSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, "VALIDATION_FAILED", parsed.error.flatten());
    }

    await useCase.deleteStatCard(parsed.data.slug);
    const allCards = await useCase.listCardsWithFormData();
    return successResponse(allCards);
  } catch (error: any) {
    logger.error("Failed to delete stat card", error);
    return errorResponse("Failed to delete stat card", 500, "CARD_DELETE_FAILED");
  }
}
