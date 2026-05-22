import { BackupLogModel, IBackupLog } from "@/data/models/backup-log.model";
import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/dev-logger";

export class MongoBackupRepository {
  async logBackup(data: Partial<IBackupLog>): Promise<IBackupLog> {
    try {
      await connectToDatabase();
      const log = new BackupLogModel(data);
      return await log.save();
    } catch (error) {
      logger.error("Failed to log backup attempt", { data, error });
      throw error;
    }
  }

  async getRecentLogs(limit = 10): Promise<IBackupLog[]> {
    try {
      await connectToDatabase();
      return await BackupLogModel.find({}).sort({ timestamp: -1 }).limit(limit).exec();
    } catch (error) {
      logger.error("Failed to fetch recent backup logs", { limit, error });
      throw error;
    }
  }
}
