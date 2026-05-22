import { auth } from "@/lib/auth";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { MongoSubmissionRepository } from "@/data/repositories/mongo-submission-repository";

const repo = new MongoSubmissionRepository();

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const status = searchParams.get("status") || "all";
    const adminName = searchParams.get("admin") || "all";
    const formId = searchParams.get("formId") || "all";
    const limit = 10;

    const result = await repo.listPaginated(page, limit, status, adminName, formId);
    return successResponse(result);
  } catch (error) {
    logger.error("Failed to fetch admin submissions", error);
    return errorResponse("Server error", 500, "SUBMISSIONS_FETCH_FAILED");
  }
}
