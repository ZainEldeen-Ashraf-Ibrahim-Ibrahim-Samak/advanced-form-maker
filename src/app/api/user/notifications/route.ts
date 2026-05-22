import { NextRequest } from "next/server";
import { MongoResubmissionRequestRepository } from "@/data/repositories/mongo-resubmission-request-repository";
import { successResponse, errorResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";

const resubmissionRepo = new MongoResubmissionRequestRepository();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return errorResponse("Missing token parameter", 400, "MISSING_TOKEN");
    }

    // Includes lazy evaluation of the 7-day expiration since the repository queries `expireOldRequests()` before returning
    const pendingRequests = await resubmissionRepo.findPendingByTargetUser(token);

    // Optionally, if the user requested the notifications, we can mark them as "delivered"
    if (pendingRequests.length > 0) {
      await resubmissionRepo.markDelivered(token);
    }

    return successResponse({ notifications: pendingRequests });
  } catch (error) {
    logger.error("Failed to fetch user notifications", { error, url: request.url });
    return errorResponse("Server error", 500, "USER_NOTIFICATIONS_FETCH_FAILED");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const token = searchParams.get("token");

    if (!id || !token) {
      return errorResponse("Missing id or token parameter", 400, "MISSING_PARAMETERS");
    }

    await resubmissionRepo.markSeen(id);
    return successResponse({ message: "Notification marked as seen" });
  } catch (error) {
    logger.error("Failed to update notification status", { error, url: request.url });
    return errorResponse("Server error", 500, "USER_NOTIFICATION_UPDATE_FAILED");
  }
}
