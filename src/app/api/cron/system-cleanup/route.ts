import { NextResponse } from "next/server";
import { MongoSettingsRepository } from "@/data/repositories/mongo-settings-repository";
import { MongoSubmissionRepository } from "@/data/repositories/mongo-submission-repository";
import { CloudinaryStorageRepository } from "@/data/repositories/cloudinary-storage-repository";
import { logger } from "@/lib/dev-logger";

export async function GET(req: Request) {
  try {
    // 1. Verify cron secret
    const authHeader = req.headers.get("Authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      logger.error("CRON_SECRET is not configured.");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      logger.warn("Unauthorized cron invocation attempt.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch settings
    const settingsRepo = new MongoSettingsRepository();
    const settings = await settingsRepo.getSettings();

    if (!settings) {
      logger.error("Cron: Settings not found. Cannot proceed.");
      return NextResponse.json({ error: "Settings not found" }, { status: 500 });
    }

    const result: Record<string, unknown> = { status: "success", operations: [] };

    // 3. Process Draft Cleanup
    if (settings.draft_retention_days && settings.draft_retention_days > 0) {
      const submissionRepo = new MongoSubmissionRepository();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.draft_retention_days);

      try {
        const deletedCount = await submissionRepo.deleteDraftsOlderThan(cutoffDate);
        (result.operations as any[]).push({
          name: "draft_cleanup",
          status: "success",
          details: `Deleted ${deletedCount} drafts older than ${settings.draft_retention_days} days.`,
        });
        logger.info(`Cron: Cleaned up ${deletedCount} drafts.`);
      } catch (err) {
        logger.error("Cron: Draft cleanup failed", err);
        (result.operations as any[]).push({
          name: "draft_cleanup",
          status: "failed",
          error: String(err),
        });
      }
    } else {
      (result.operations as any[]).push({
        name: "draft_cleanup",
        status: "skipped",
        details: "draft_retention_days is not set or zero.",
      });
    }

    // 4. Process Cloudinary Storage Cleanup
    if (settings.cloudinary_storage_threshold && settings.storage_cleanup_target && settings.storage_cleanup_target !== "none" as any) {
      try {
        const storageRepo = new CloudinaryStorageRepository();
        const metrics = await storageRepo.getUsageMetrics();
        const usedPercent = metrics.storage.used_percent * 100;

        if (usedPercent >= settings.cloudinary_storage_threshold) {
          logger.info(`Cron: Cloudinary usage (${usedPercent.toFixed(2)}%) exceeds threshold (${settings.cloudinary_storage_threshold}%). Initiating cleanup target: ${settings.storage_cleanup_target}`);
          
          const target = settings.storage_cleanup_target as "drafts" | "unused_media";
          const deletedMediaCount = await storageRepo.deleteMediaByTarget(target);
          
          (result.operations as any[]).push({
            name: "cloudinary_cleanup",
            status: "success",
            details: `Deleted ${deletedMediaCount} media items for target ${target}. Current usage was ${usedPercent.toFixed(2)}%.`,
          });
        } else {
          (result.operations as any[]).push({
            name: "cloudinary_cleanup",
            status: "skipped",
            details: `Current usage (${usedPercent.toFixed(2)}%) is below threshold (${settings.cloudinary_storage_threshold}%).`,
          });
        }
      } catch (err) {
        logger.error("Cron: Cloudinary cleanup failed", err);
        (result.operations as any[]).push({
          name: "cloudinary_cleanup",
          status: "failed",
          error: String(err),
        });
      }
    } else {
      (result.operations as any[]).push({
        name: "cloudinary_cleanup",
        status: "skipped",
        details: "cloudinary_storage_threshold or storage_cleanup_target is not configured.",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Cron system-cleanup failed completely", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
