import { auth } from "@/lib/auth";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";
import { SubmissionModel } from "@/data/models/submission.model";
import { connectToDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return unauthorizedResponse();
  }

  try {
    await connectToDatabase();
    
    // Get distinct adminNames from all auditTrails
    const uniqueAdmins = await SubmissionModel.distinct("auditTrail.adminName");
    
    // Filter out null/undefined/empty strings and sort alphabetically
    const filteredAdmins = uniqueAdmins.filter(name => !!name).sort();

    return successResponse(filteredAdmins);
  } catch (error) {
    logger.error("Failed to fetch admin list for filter", error);
    return errorResponse("Server error", 500, "ADMIN_FETCH_FAILED");
  }
}
