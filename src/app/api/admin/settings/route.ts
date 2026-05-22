import { ManageSettingsUseCase } from "@/domain/use-cases/admin/manage-settings";
import { auth } from "@/lib/auth"; // Assume auth check
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { parseSecureJson } from "@/lib/api-security";
import type { ISettingsConfiguration } from "@/data/models/settings.model";

const useCase = new ManageSettingsUseCase();

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse();
    }

    const settings = await useCase.getSettings();
    return successResponse(settings || {});
  } catch (error: unknown) {
    logger.error("Failed to fetch admin settings", error);
    const message = error instanceof Error ? error.message : "Failed to fetch settings";
    return errorResponse(message, 500, "SETTINGS_FETCH_FAILED");
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse();
    }

    const parsedBody = await parseSecureJson<
      Partial<Pick<ISettingsConfiguration, "backup" | "cron" | "draft_retention_days" | "cloudinary_storage_threshold" | "storage_cleanup_target">>
    >(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }
    const body = parsedBody.data;
    const updaterId = session.user.id || "admin";

    const updated = await useCase.updateSettings(updaterId, {
      backup: body.backup,
      cron: body.cron,
      draft_retention_days: body.draft_retention_days,
      cloudinary_storage_threshold: body.cloudinary_storage_threshold,
      storage_cleanup_target: body.storage_cleanup_target,
    });

    return successResponse(updated);
  } catch (error: unknown) {
    logger.error("Failed to update admin settings", error);
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return errorResponse(message, 500, "SETTINGS_UPDATE_FAILED");
  }
}
