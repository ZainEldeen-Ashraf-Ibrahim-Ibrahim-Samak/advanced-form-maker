import { ExecuteBackupUseCase } from "@/domain/use-cases/admin/execute-backup";
import { env } from "@/env.mjs";
import { auth } from "@/lib/auth";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-response";
import { logger } from "@/lib/dev-logger";

const useCase = new ExecuteBackupUseCase();

// Support POST for manual trigger
export async function POST(_request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse();
    }

    const result = await useCase.execute("manual");
    return successResponse(result);
  } catch (error: unknown) {
    logger.error("Manual backup execution failed", error);
    const message = error instanceof Error ? error.message : "Backup execution failed";
    return errorResponse(message, 500, "BACKUP_MANUAL_FAILED");
  }
}

// Support GET for Vercel Cron (Secured by vercel cron token or manual auth bypass logic on Vercel)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return errorResponse("Unauthorized cron", 401, "UNAUTHORIZED");
    }

    const result = await useCase.execute("cron");
    return successResponse(result);
  } catch (error: unknown) {
    logger.error("Cron backup execution failed", error);
    const message = error instanceof Error ? error.message : "Cron backup execution failed";
    return errorResponse(message, 500, "BACKUP_CRON_FAILED");
  }
}

// Optionally, this same endpoint (or a different one like /api/cron/backup) can be hit by Vercel Cron
// For now, we support triggering backup manually through standard admin authenticated requests.
