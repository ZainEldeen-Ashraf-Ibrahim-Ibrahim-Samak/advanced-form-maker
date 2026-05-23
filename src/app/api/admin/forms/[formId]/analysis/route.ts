import { ManageFormAnalysisUseCase } from "@/domain/use-cases/admin/manage-form-analysis";
import { auth } from "@/lib/auth";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { parseSecureJson } from "@/lib/api-security";

const useCase = new ManageFormAnalysisUseCase();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return unauthorizedResponse();
    }

    const { formId } = await params;
    const analysis = await useCase.getAnalysis(formId);
    return successResponse(analysis);
  } catch (error: unknown) {
    logger.error("Failed to fetch form analysis", error);
    const message = error instanceof Error ? error.message : "Failed to fetch analysis";
    return errorResponse(message, 500, "ANALYSIS_FETCH_FAILED");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return unauthorizedResponse();
    }

    const { formId } = await params;
    
    // Check if analysis is disabled before running
    const existing = await useCase.getAnalysis(formId);
    if (existing && !existing.enabled) {
      return errorResponse("AI analysis is disabled for this form template", 400, "ANALYSIS_DISABLED");
    }

    let locale = "ar";
    try {
      const body = await request.clone().json();
      if (body && typeof body.locale === "string") {
        locale = body.locale;
      }
    } catch {
      // Ignore if body is empty or malformed
    }

    // Trigger analysis asynchronously in the background to prevent timeouts
    useCase.triggerAnalysis(formId, locale).catch((err) => {
      logger.error(`Background analysis failed for form ${formId} in locale ${locale}:`, err);
    });

    return successResponse({ status: "running" }, 202);
  } catch (error: unknown) {
    logger.error("Failed to trigger form analysis", error);
    const message = error instanceof Error ? error.message : "Failed to trigger analysis";
    return errorResponse(message, 503, "ANALYSIS_TRIGGER_FAILED");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return unauthorizedResponse();
    }

    const { formId } = await params;
    const parsedBody = await parseSecureJson<{ enabled: boolean }>(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }

    const { enabled } = parsedBody.data;
    if (typeof enabled !== "boolean") {
      return errorResponse("enabled must be a boolean", 400, "INVALID_INPUT");
    }

    const updated = await useCase.setEnabled(formId, enabled);
    return successResponse(updated);
  } catch (error: unknown) {
    logger.error("Failed to update form analysis enabled state", error);
    const message = error instanceof Error ? error.message : "Failed to update enabled state";
    return errorResponse(message, 500, "ANALYSIS_UPDATE_FAILED");
  }
}
