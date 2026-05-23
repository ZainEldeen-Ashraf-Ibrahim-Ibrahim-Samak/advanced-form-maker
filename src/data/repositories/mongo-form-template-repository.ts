import { FormTemplateRepository } from "@/domain/repositories/form-template-repository";
import { FormTemplate, CreateFormTemplateInput, UpdateFormTemplateInput } from "@/domain/entities/form-template";
import { FormTemplateModel } from "@/data/models/form-template.model";
import { connectToDatabase } from "@/lib/db";
import { CacheService } from "@/data/services/cache-service";
import mongoose from "mongoose";
import { logger } from "@/lib/dev-logger";
import { normalizeContactFormFields } from "@/lib/contact-form";

const DEFAULT_CONTACT_NAME = "Primary Contact";

function isFormTemplateEntity(value: unknown): value is FormTemplate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.name === "string" &&
    Array.isArray(candidate.contactFormFields)
  );
}

function toEntity(doc: Record<string, unknown>): FormTemplate {
  const rawContactRecords = Array.isArray(doc.contactRecords) ? doc.contactRecords : [];
  const contactRecords = rawContactRecords
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const id = String(record.id ?? "").trim();
      const name = String(record.name ?? "").trim();
      if (!id) return null;
      return {
        id,
        name: name || DEFAULT_CONTACT_NAME,
        email: String(record.email ?? ""),
        phone: String(record.phone ?? ""),
        contact: String(record.contact ?? ""),
        role: String(record.role ?? ""),
        notes: String(record.notes ?? ""),
      };
    })
    .filter((record): record is NonNullable<typeof record> => !!record);

  const contactFormFields = normalizeContactFormFields(doc.contactFormFields);

  return {
    id: doc._id?.toString() ?? "",
    name: doc.name as string,
    description: (doc.description as string) ?? "",
    contactRecords,
    contactFormFields,
    isActive: doc.isActive as boolean,
    isLocked: !!doc.isLocked,
    isContactForm: !!doc.isContactForm,
    contactFormLocked: !!doc.contactFormLocked,
    aiAutoFillEnabled: !!doc.aiAutoFillEnabled,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export class MongoFormTemplateRepository implements FormTemplateRepository {
  async create(input: CreateFormTemplateInput): Promise<FormTemplate> {
    try {
      await connectToDatabase();
      const doc = await FormTemplateModel.create({
        name: input.name,
        description: input.description ?? "",
        contactRecords: [{ id: "primary", name: "Primary Contact", email: "", phone: "", role: "", notes: "" }],
        isActive: true,
        isContactForm: input.isContactForm ?? false,
        aiAutoFillEnabled: input.aiAutoFillEnabled ?? false,
      });
      await CacheService.invalidateFormCache();
      return toEntity(doc.toObject() as unknown as Record<string, unknown>);
    } catch (error) {
      logger.error("Failed to create form template", { input, error });
      throw error;
    }
  }

  async findById(id: string): Promise<FormTemplate | null> {
    try {
      await connectToDatabase();
      const doc = await FormTemplateModel.findById(id).lean();
      return doc ? toEntity(doc) : null;
    } catch (error) {
      logger.error("Failed to find form template by id", { id, error });
      throw error;
    }
  }

  async findActive(): Promise<FormTemplate | null> {
    try {
      const cachedOrFresh = (await CacheService.getActiveForm(async () => {
        await connectToDatabase();
        const doc = await FormTemplateModel.findOne({ isActive: true }).lean();
        return doc ? toEntity(doc) : null;
      })) as unknown;

      if (cachedOrFresh === null) {
        return null;
      }

      if (isFormTemplateEntity(cachedOrFresh)) {
        return cachedOrFresh;
      }

      logger.warn("Invalid cached active form payload detected; forcing DB refresh", {
        payloadType: typeof cachedOrFresh,
      });

      await CacheService.invalidateFormCache();
      await connectToDatabase();
      const doc = await FormTemplateModel.findOne({ isActive: true }).lean();
      return doc ? toEntity(doc) : null;
    } catch (error) {
      logger.error("Failed to find active form template", error);
      throw error;
    }
  }

  async findAll(): Promise<FormTemplate[]> {
    try {
      await connectToDatabase();
      const docs = await FormTemplateModel.find().sort({ createdAt: -1 }).lean();
      return docs.map(toEntity);
    } catch (error) {
      logger.error("Failed to find all form templates", error);
      throw error;
    }
  }

  async update(id: string, input: UpdateFormTemplateInput): Promise<FormTemplate | null> {
    try {
      await connectToDatabase();
      const doc = await FormTemplateModel.findByIdAndUpdate(id, { $set: input }, { new: true }).lean();
      await CacheService.invalidateFormCache();
      return doc ? toEntity(doc) : null;
    } catch (error) {
      logger.error("Failed to update form template", { id, input, error });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await connectToDatabase();
      const result = await FormTemplateModel.findByIdAndDelete(id);
      await CacheService.invalidateFormCache();
      return !!result;
    } catch (error) {
      logger.error("Failed to delete form template", { id, error });
      throw error;
    }
  }

  async deactivateAll(): Promise<void> {
    try {
      await connectToDatabase();
      await FormTemplateModel.updateMany({}, { isActive: false });
      await CacheService.invalidateFormCache();
    } catch (error) {
      logger.error("Failed to deactivate all form templates", error);
      throw error;
    }
  }

  async countSubmissions(formTemplateId: string): Promise<number> {
    try {
      await connectToDatabase();
      const SubmissionModel = mongoose.models.Submission;
      if (!SubmissionModel) return 0;
      return await SubmissionModel.countDocuments({ formTemplateId });
    } catch (error) {
      logger.error("Failed to count submissions for form template", { formTemplateId, error });
      throw error;
    }
  }

  async setLocked(id: string, isLocked: boolean): Promise<FormTemplate | null> {
    try {
      await connectToDatabase();
      const doc = await FormTemplateModel.findByIdAndUpdate(id, { isLocked }, { new: true }).lean();
      await CacheService.invalidateFormCache();
      return doc ? toEntity(doc) : null;
    } catch (error) {
      logger.error("Failed to set locked status for form template", { id, isLocked, error });
      throw error;
    }
  }
}
