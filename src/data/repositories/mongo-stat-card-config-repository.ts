import { StatCardConfigRepository } from "@/domain/repositories/stat-card-config-repository";
import { StatCardConfig, UpdateStatCardConfigInput } from "@/domain/entities/stat-card-config";
import { StatCardConfigModel } from "@/data/models/stat-card-config.model";
import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/dev-logger";

function toEntity(doc: any): StatCardConfig {
  return {
    id: doc._id?.toString() ?? "",
    slug: doc.slug,
    visible: !!doc.visible,
    sortOrder: typeof doc.sortOrder === "number" ? doc.sortOrder : 0,
    displayNameAr: doc.displayNameAr ?? null,
    displayNameEn: doc.displayNameEn ?? null,
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
            },
          },
          upsert: true,
        },
      }));

      await StatCardConfigModel.bulkWrite(bulkOps);
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

        return {
          updateOne: {
            filter: { slug: config.slug },
            update: { $set: updateDoc },
            upsert: true,
          },
        };
      });

      await StatCardConfigModel.bulkWrite(bulkOps);
    } catch (error) {
      logger.error("Failed to upsert stat card configs", { configs, error });
      throw error;
    }
  }
}
