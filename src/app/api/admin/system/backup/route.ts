import { NextResponse } from "next/server";
import { MongoSystemRepository } from "@/data/repositories/mongo-system-repository";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/dev-logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const systemRepo = new MongoSystemRepository();
    const backupData = await systemRepo.generateBackup();

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="system-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json"`,
      },
    });
  } catch (error) {
    logger.error("Failed to generate backup", error);
    return NextResponse.json({ error: "Failed to generate backup" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("backup") as File;

    if (!file) {
      return NextResponse.json({ error: "No backup file provided" }, { status: 400 });
    }

    const fileContent = await file.text();
    let backupData;
    
    try {
      backupData = JSON.parse(fileContent);
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
    }

    if (typeof backupData !== "object" || backupData === null) {
      return NextResponse.json({ error: "Invalid backup data structure" }, { status: 400 });
    }

    const systemRepo = new MongoSystemRepository();
    await systemRepo.restoreBackup(backupData);

    return NextResponse.json({ message: "System restored successfully" }, { status: 200 });
  } catch (error) {
    logger.error("Failed to restore backup", error);
    return NextResponse.json({ error: "Failed to restore backup. See server logs for details." }, { status: 500 });
  }
}

