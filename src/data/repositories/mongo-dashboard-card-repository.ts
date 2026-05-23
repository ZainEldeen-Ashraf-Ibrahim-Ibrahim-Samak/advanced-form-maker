import { DashboardCard, UpdateDashboardCardInput } from "@/domain/entities/dashboard-card";
import { DashboardCardRepository } from "@/domain/repositories/dashboard-card-repository";
import { DashboardCardModel } from "@/data/models/dashboard-card.model";
import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/dev-logger";
import mongoose from "mongoose";

function toEntity(doc: any): DashboardCard {
  return {
    id: doc._id?.toString() ?? "",
    formTemplateId: doc.formTemplateId?.toString() ?? "",
    visible: !!doc.visible,
    sortOrder: typeof doc.sortOrder === "number" ? doc.sortOrder : 0,
    displayNameAr: doc.displayNameAr ?? null,
    displayNameEn: doc.displayNameEn ?? null,
    logoUrl: doc.logoUrl ?? null,
    metricLabel: doc.metricLabel ?? null,
    metricValue: doc.metricValue ?? null,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export class MongoDashboardCardRepository implements DashboardCardRepository {
  async listAll(): Promise<DashboardCard[]> {
    try {
      await connectToDatabase();
      const docs = await DashboardCardModel.find().sort({ sortOrder: 1, createdAt: -1 }).lean().exec();
      return docs.map(toEntity);
    } catch (error) {
      logger.error("Failed to list dashboard cards", error);
      throw error;
    }
  }

  async updateMany(cards: UpdateDashboardCardInput[]): Promise<void> {
    try {
      if (cards.length === 0) return;
      await connectToDatabase();
      
      const bulkOps = cards.map((card) => {
        const updateDoc: Record<string, any> = {};
        if (card.visible !== undefined) updateDoc.visible = card.visible;
        if (card.sortOrder !== undefined) updateDoc.sortOrder = card.sortOrder;
        if (card.displayNameAr !== undefined) updateDoc.displayNameAr = card.displayNameAr;
        if (card.displayNameEn !== undefined) updateDoc.displayNameEn = card.displayNameEn;
        if (card.logoUrl !== undefined) updateDoc.logoUrl = card.logoUrl;
        if (card.metricLabel !== undefined) updateDoc.metricLabel = card.metricLabel;
        if (card.metricValue !== undefined) updateDoc.metricValue = card.metricValue;
        
        return {
          updateOne: {
            filter: { formTemplateId: new mongoose.Types.ObjectId(card.formTemplateId) },
            update: { $set: updateDoc },
          },
        };
      });

      await DashboardCardModel.bulkWrite(bulkOps);
    } catch (error) {
      logger.error("Failed to bulk update dashboard cards", { cards, error });
      throw error;
    }
  }

  async createForForm(formId: string): Promise<DashboardCard> {
    try {
      await connectToDatabase();
      
      // Calculate max sortOrder to place the new card at the end
      const lastCard = await DashboardCardModel.findOne().sort({ sortOrder: -1 }).lean().exec();
      const newSortOrder = lastCard ? lastCard.sortOrder + 1 : 0;

      const doc = await DashboardCardModel.create({
        formTemplateId: new mongoose.Types.ObjectId(formId),
        visible: true,
        sortOrder: newSortOrder,
      });

      return toEntity(doc.toObject());
    } catch (error) {
      logger.error("Failed to create dashboard card for form", { formId, error });
      throw error;
    }
  }

  async deleteByFormId(formId: string): Promise<boolean> {
    try {
      await connectToDatabase();
      const result = await DashboardCardModel.deleteOne({
        formTemplateId: new mongoose.Types.ObjectId(formId),
      });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error("Failed to delete dashboard card by form ID", { formId, error });
      throw error;
    }
  }
}
