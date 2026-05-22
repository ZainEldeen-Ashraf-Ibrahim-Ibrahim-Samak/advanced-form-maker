import { auth } from "@/lib/auth";
import { MongoSubmissionRepository } from "@/data/repositories/mongo-submission-repository";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";

const repo = new MongoSubmissionRepository();

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const counts = await repo.getCounts();
    return successResponse(counts);
  } catch (error) {
    logger.error("Failed to fetch submission counts", error);
    return errorResponse("Server error", 500, "SUBMISSIONS_COUNTS_FAILED");
  }
}
