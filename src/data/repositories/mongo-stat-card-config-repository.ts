import { StatCardConfigRepository } from "@/domain/repositories/stat-card-config-repository";
import {
  StatCardConfig,
  UpdateStatCardConfigInput,
  CreateStatCardConfigInput,
} from "@/domain/entities/stat-card-config";
import { StatCardConfigModel } from "@/data/models/stat-card-config.model";
import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/dev-logger";

const DEFAULT_SLUGS = new Set(["total", "pending", "draft", "viewed", "needs_rewrite"]);

function toEntity(doc: any): StatCardConfig {
  return {
    id: doc._id?.toString() ?? "",
    slug: doc.slug,
    visible: !!doc.visible,
    sortOrder: typeof doc.sortOrder === "number" ? doc.sortOrder : 0,
    displayNameAr: doc.displayNameAr ?? null,
    displayNameEn: doc.displayNameEn ?? null,
    logoUrl: doc.logoUrl ?? null,
    metricLabel: doc.metricLabel ?? null,
    metricValue: doc.metricValue ?? null,
    isDefault: DEFAULT_SLUGS.has(doc.slug),
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export class MongoStatCardConfigRepository implements StatCardConfigRepository {
  async listAll(): Promise<StatCardConfig[]> {
    try {
      await connectToDatabase();
      const docs = await StatCardConfigModel.find().sort({ sortOrder: 1 }).lean().exec();
      return docs.map(toEntity);
    } catch (error) {
      logger.error("Failed to list stat card configs", error);
      throw error;
    }
  }

  async seedDefaults(): Promise<void> {
    try {
      await connectToDatabase();
      // Only seed on first-ever run — if any cards already exist, skip
      const count = await StatCardConfigModel.countDocuments();
      if (count > 0) return;

      const defaults = [
        { slug: "total", sortOrder: 0 },
        { slug: "pending", sortOrder: 1 },
        { slug: "draft", sortOrder: 2 },
        { slug: "viewed", sortOrder: 3 },
        { slug: "needs_rewrite", sortOrder: 4 },
      ] as const;

      const bulkOps = defaults.map((def) => ({
        updateOne: {
          filter: { slug: def.slug },
          update: {
            $setOnInsert: {
              slug: def.slug,
              visible: true,
              sortOrder: def.sortOrder,
              displayNameAr: null,
              displayNameEn: null,
              logoUrl: null,
            },
          },
          upsert: true,
        },
      }));

      await StatCardConfigModel.bulkWrite(bulkOps as any);
    } catch (error) {
      logger.error("Failed to seed default stat card configs", error);
      throw error;
    }
  }

  async upsertMany(configs: UpdateStatCardConfigInput[]): Promise<void> {
    try {
      if (configs.length === 0) return;
      await connectToDatabase();

      const bulkOps = configs.map((config) => {
        const updateDoc: Record<string, any> = {};
        if (config.visible !== undefined) updateDoc.visible = config.visible;
        if (config.sortOrder !== undefined) updateDoc.sortOrder = config.sortOrder;
        if (config.displayNameAr !== undefined) updateDoc.displayNameAr = config.displayNameAr;
        if (config.displayNameEn !== undefined) updateDoc.displayNameEn = config.displayNameEn;
        if (config.logoUrl !== undefined) updateDoc.logoUrl = config.logoUrl;
        if (config.metricLabel !== undefined) updateDoc.metricLabel = config.metricLabel;
        if (config.metricValue !== undefined) updateDoc.metricValue = config.metricValue;

        return {
          updateOne: {
            filter: { slug: config.slug },
            update: { $set: updateDoc },
            upsert: true,
          },
        };
      });

      await StatCardConfigModel.bulkWrite(bulkOps as any);
    } catch (error) {
      logger.error("Failed to upsert stat card configs", { configs, error });
      throw error;
    }
  }

  async create(input: CreateStatCardConfigInput): Promise<StatCardConfig> {
    try {
      await connectToDatabase();
      const doc = await StatCardConfigModel.create({
        slug: input.slug,
        displayNameAr: input.displayNameAr,
        displayNameEn: input.displayNameEn,
        logoUrl: input.logoUrl ?? null,
        metricLabel: input.metricLabel ?? null,
        metricValue: input.metricValue ?? null,
        sortOrder: input.sortOrder,
        visible: true,
        isDefault: false,
      });
      return toEntity(doc.toObject());
    } catch (error) {
      logger.error("Failed to create stat card config", { input, error });
      throw error;
    }
  }

  async deleteBySlug(slug: string): Promise<void> {
    try {
      await connectToDatabase();
      await StatCardConfigModel.deleteOne({ slug });
    } catch (error) {
      logger.error("Failed to delete stat card config", { slug, error });
      throw error;
    }
  }
}
