import { NextResponse } from "next/server";
import { CloudinaryStorageRepository } from "@/data/repositories/cloudinary-storage-repository";
import { cacheGet } from "@/lib/redis";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/dev-logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const repo = new CloudinaryStorageRepository();
    
    // Cache for 1 hour (3600 seconds)
    const metrics = await cacheGet(
      "analytics:cloudinary_usage",
      3600,
      async () => await repo.getUsageMetrics()
    );

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error("Failed to fetch cloudinary usage analytics", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
