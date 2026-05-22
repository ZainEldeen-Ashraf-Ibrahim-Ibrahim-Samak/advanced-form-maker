import { ManageMediaUseCase } from "@/domain/use-cases/admin/manage-media";
import { auth } from "@/lib/auth";
import { badRequestResponse, errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";

const useCase = new ManageMediaUseCase();

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;

    const data = await useCase.getMediaFiles(cursor);
    return successResponse(data);
  } catch (error: unknown) {
    logger.error("Failed to fetch media files", error);
    const message = error instanceof Error ? error.message : "Failed to fetch media files";
    return errorResponse(message, 500, "MEDIA_FETCH_FAILED");
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get("publicId");

    if (!publicId) {
       return badRequestResponse("Missing publicId");
    }

    const result = await useCase.deleteMediaFile(publicId);
    return successResponse(result);
  } catch (error: unknown) {
    logger.error("Failed to delete media file", error);
    const message = error instanceof Error ? error.message : "Failed to delete media file";
    return errorResponse(message, 500, "MEDIA_DELETE_FAILED");
  }
}
