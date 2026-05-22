import { SettingsConfigurationModel, ISettingsConfiguration } from "@/data/models/settings.model";
import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/dev-logger";

export class MongoSettingsRepository {
  async getSettings(): Promise<ISettingsConfiguration | null> {
    try {
      await connectToDatabase();
      return await SettingsConfigurationModel.findOne({}).exec();
    } catch (error) {
      logger.error("Failed to fetch settings", error);
      throw error;
    }
  }

  async upsertSettings(
    updaterId: string,
    updates: Partial<ISettingsConfiguration>
  ): Promise<ISettingsConfiguration> {
    try {
      await connectToDatabase();
      const settings = await this.getSettings();
      if (!settings) {
        // Create singleton
        const newSettings = new SettingsConfigurationModel({
          ...updates,
          updatedBy: updaterId,
        });
        return await newSettings.save();
      }

      Object.assign(settings, updates);
      settings.updatedBy = updaterId;
      return await settings.save();
    } catch (error) {
      logger.error("Failed to upsert settings", { updaterId, updates, error });
      throw error;
    }
  }

  async updateLastBackupRun(): Promise<void> {
    try {
      await connectToDatabase();
      await SettingsConfigurationModel.updateOne(
        {},
        { $set: { "backup.lastRunAt": new Date() } }
      ).exec();
    } catch (error) {
      logger.error("Failed to update last backup run timestamp", error);
      throw error;
    }
  }
}
