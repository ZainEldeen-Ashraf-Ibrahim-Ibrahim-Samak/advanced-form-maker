import { MongoSettingsRepository } from "@/data/repositories/mongo-settings-repository";
import { ISettingsConfiguration } from "@/data/models/settings.model";
import { z } from "zod";

export class ManageSettingsUseCase {
  private repo = new MongoSettingsRepository();

  async getSettings(): Promise<ISettingsConfiguration | null> {
    return await this.repo.getSettings();
  }

  async updateSettings(updaterId: string, updates: Partial<ISettingsConfiguration>) {
    return await this.repo.upsertSettings(updaterId, updates);
  }

  async updateBranding(updaterId: string, input: { siteName?: string; siteLogoUrl?: string; siteFaviconUrl?: string }) {
    const urlField = z.union([z.string().url(), z.literal("")]).optional();
    const parsed = z.object({
      siteName: z.string().min(1).max(100).optional(),
      siteLogoUrl: urlField,
      siteFaviconUrl: urlField,
    }).parse(input);

    return await this.repo.updateBranding(updaterId, parsed);
  }
}
