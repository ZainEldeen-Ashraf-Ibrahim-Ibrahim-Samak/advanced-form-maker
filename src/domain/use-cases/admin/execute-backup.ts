import { MongoSettingsRepository } from "@/data/repositories/mongo-settings-repository";
import { MongoBackupRepository } from "@/data/repositories/mongo-backup-repository";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

export class ExecuteBackupUseCase {
  private settingsRepo = new MongoSettingsRepository();
  private backupRepo = new MongoBackupRepository();

  async execute(triggerType: "manual" | "cron" = "manual") {
    const settings = await this.settingsRepo.getSettings();
    if (!settings || !settings.backup.active) {
      throw new Error("Backup is not active or settings missing.");
    }

    const dest = settings.backup.destination;

    try {
      // 1. Fetch all documents across critical collections cleanly via cursor to prevent memory limit
      const db = mongoose.connection.db;
      if (!db) throw new Error("No mongoose connection");

      const collections = ["submissions", "fieldvalues", "formdefinitions", "settingsconfigurations"];
      const backupData: Record<string, any[]> = {};

      for (const colName of collections) {
        backupData[colName] = [];
        const cursor = db.collection(colName).find({});
        for await (const doc of cursor) {
          backupData[colName].push(doc);
        }
      }

      const buffer = Buffer.from(JSON.stringify(backupData));
      const sizeMb = buffer.length / (1024 * 1024);

      let secureUrl = "";

      // 2. Export if Cloud destination
      if (dest === "cloud" || dest === "both") {
        secureUrl = await new Promise((resolve, reject) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          cloudinary.uploader.upload_stream(
            {
              resource_type: "raw",
              folder: "db_backups",
              public_id: `backup_${timestamp}.json`
            },
            (error, result) => {
              if (error || !result) reject(error || new Error("Upload failed"));
              else resolve(result.secure_url);
            }
          ).end(buffer);
        });
      }

      // If local, we would write to fs. (Assume Next.js root /backups folder)
      if (dest === "local" || dest === "both") {
        const fs = require("fs");
        const path = require("path");
        const backupDir = path.join(process.cwd(), "backups");
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const filePath = path.join(backupDir, `backup_${Date.now()}.json`);
        fs.writeFileSync(filePath, buffer);
        if (!secureUrl) secureUrl = `file://${filePath}`;
      }

      await this.settingsRepo.updateLastBackupRun();
      
      const log = await this.backupRepo.logBackup({
        triggerType,
        destination: dest,
        status: "success",
        fileReferenceUrl: secureUrl,
        fileSizeMb: sizeMb,
      });

      return log;
    } catch (e: any) {
      await this.backupRepo.logBackup({
        triggerType,
        destination: dest,
        status: "failed",
        errorMessage: e.message,
      });
      throw e;
    }
  }
}
