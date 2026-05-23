import { FormAnalysis } from "@/domain/entities/form-analysis";
import { IFormAnalysisRepository } from "@/domain/repositories/form-analysis-repository";
import { FormAnalysisModel } from "@/data/models/form-analysis.model";
import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/dev-logger";
import mongoose from "mongoose";

function toEntity(doc: any): FormAnalysis {
  return {
    id: doc._id?.toString() ?? "",
    formTemplateId: doc.formTemplateId?.toString() ?? "",
    enabled: doc.enabled !== undefined ? !!doc.enabled : true,
    summary: doc.summary ?? null,
    patterns: Array.isArray(doc.patterns) ? doc.patterns : [],
    findings: Array.isArray(doc.findings) ? doc.findings : [],
    sentimentOverview: doc.sentimentOverview ?? null,
    analyzedAt: doc.analyzedAt ? new Date(doc.analyzedAt) : null,
    submissionCount: typeof doc.submissionCount === "number" ? doc.submissionCount : 0,
    analysisStatus: doc.analysisStatus ?? "idle",
    errorMessage: doc.errorMessage ?? null,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export class MongoFormAnalysisRepository implements IFormAnalysisRepository {
  async findByFormId(formId: string): Promise<FormAnalysis | null> {
    try {
      await connectToDatabase();
      const doc = await FormAnalysisModel.findOne({
        formTemplateId: new mongoose.Types.ObjectId(formId),
      }).lean().exec();
      
      if (!doc) return null;
      return toEntity(doc);
    } catch (error) {
      logger.error("Failed to find form analysis by form ID", { formId, error });
      throw error;
    }
  }

  async upsert(formId: string, data: Partial<FormAnalysis>): Promise<FormAnalysis> {
    try {
      await connectToDatabase();
      const updateData: Record<string, any> = { ...data };
      delete updateData.id;
      delete updateData.formTemplateId;

      const doc = await FormAnalysisModel.findOneAndUpdate(
        { formTemplateId: new mongoose.Types.ObjectId(formId) },
        { $set: updateData },
        { upsert: true, new: true }
      ).exec();

      return toEntity(doc.toObject());
    } catch (error) {
      logger.error("Failed to upsert form analysis", { formId, data, error });
      throw error;
    }
  }

  async setEnabled(formId: string, enabled: boolean): Promise<FormAnalysis | null> {
    try {
      await connectToDatabase();
      const doc = await FormAnalysisModel.findOneAndUpdate(
        { formTemplateId: new mongoose.Types.ObjectId(formId) },
        { $set: { enabled } },
        { new: true }
      ).exec();

      if (!doc) return null;
      return toEntity(doc.toObject());
    } catch (error) {
      logger.error("Failed to set form analysis enabled", { formId, enabled, error });
      throw error;
    }
  }

  async setStatus(
    formId: string,
    status: FormAnalysis["analysisStatus"],
    errorMessage?: string | null
  ): Promise<FormAnalysis | null> {
    try {
      await connectToDatabase();
      const updateDoc: Record<string, any> = { analysisStatus: status };
      if (errorMessage !== undefined) {
        updateDoc.errorMessage = errorMessage;
      }

      const doc = await FormAnalysisModel.findOneAndUpdate(
        { formTemplateId: new mongoose.Types.ObjectId(formId) },
        { $set: updateDoc },
        { new: true }
      ).exec();

      if (!doc) return null;
      return toEntity(doc.toObject());
    } catch (error) {
      logger.error("Failed to set form analysis status", { formId, status, errorMessage, error });
      throw error;
    }
  }
}
