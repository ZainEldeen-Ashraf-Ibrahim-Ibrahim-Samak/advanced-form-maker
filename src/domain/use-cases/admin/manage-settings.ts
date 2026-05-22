import { MongoSettingsRepository } from "@/data/repositories/mongo-settings-repository";
import { ISettingsConfiguration } from "@/data/models/settings.model";

export class ManageSettingsUseCase {
  private repo = new MongoSettingsRepository();

  async getSettings(): Promise<ISettingsConfiguration | null> {
    return await this.repo.getSettings();
  }

  async updateSettings(updaterId: string, updates: Partial<ISettingsConfiguration>) {
    return await this.repo.upsertSettings(updaterId, updates);
  }
}
