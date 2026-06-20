import { ManageSettingsUseCase } from "@/domain/use-cases/admin/manage-settings";
import { auth } from "@/lib/auth";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { parseSecureJson } from "@/lib/api-security";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const useCase = new ManageSettingsUseCase();

const urlField = z.union([z.string().url("Invalid URL format"), z.literal("")]).optional();
const patchSchema = z.object({
  siteName: z.string().min(1, "Site name cannot be empty").max(100, "Site name is too long").optional(),
  siteLogoUrl: urlField,
  siteFaviconUrl: urlField,
}).refine(
  (data) => data.siteName !== undefined || data.siteLogoUrl !== undefined || data.siteFaviconUrl !== undefined,
  { message: "At least one branding field must be provided" },
);

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse();
    }

    const parsedBody = await parseSecureJson<any>(request);
    if (!parsedBody.success) {
      return errorResponse(parsedBody.error, 400, parsedBody.code);
    }

    const bodyResult = patchSchema.safeParse(parsedBody.data);
    if (!bodyResult.success) {
      return errorResponse(bodyResult.error.issues[0].message, 400, "INVALID_INPUT");
    }

    const updaterId = session.user.id || "admin";
    const updatedSettings = await useCase.updateBranding(updaterId, bodyResult.data);

    revalidatePath("/", "layout");

    return successResponse({
      siteName: updatedSettings.branding?.siteName,
      siteLogoUrl: updatedSettings.branding?.siteLogoUrl,
      siteFaviconUrl: updatedSettings.branding?.siteFaviconUrl,
    });
  } catch (error: unknown) {
    logger.error("Failed to update branding settings", error);
    const message = error instanceof Error ? error.message : "Failed to update branding settings";
    return errorResponse(message, 500, "BRANDING_UPDATE_FAILED");
  }
}
