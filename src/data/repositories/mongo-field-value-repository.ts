import { FieldValueRepository } from "@/domain/repositories/field-value-repository";
import { FieldValue, CreateFieldValueInput, UpdateFieldValueInput } from "@/domain/entities/field-value";
import { FieldValueModel } from "@/data/models/field-value.model";
import { connectToDatabase } from "@/lib/db";

function toEntity(doc: Record<string, unknown>): FieldValue {
  const rawValue = doc.value as unknown;
  return {
    id: doc._id?.toString() ?? "",
    submissionId: doc.submissionId?.toString() ?? "",
    fieldDefinitionId: doc.fieldDefinitionId?.toString() ?? "",
    fieldNameSnapshot: doc.fieldNameSnapshot as string,
    fieldTypeSnapshot: doc.fieldTypeSnapshot as FieldValue["fieldTypeSnapshot"],
    value: Array.isArray(rawValue)
      ? rawValue.map((v) => String(v))
      : (rawValue as FieldValue["value"]),
    mediaUrl: doc.mediaUrl as string | null,
    mediaPublicId: doc.mediaPublicId as string | null,
    mediaItems: (doc.mediaItems as { url: string; publicId: string }[]) ?? [],
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export class MongoFieldValueRepository implements FieldValueRepository {
  async createMany(inputs: CreateFieldValueInput[]): Promise<FieldValue[]> {
    await connectToDatabase();
    const docs = await FieldValueModel.insertMany(inputs);
    return docs.map((doc) => toEntity(doc.toObject() as unknown as Record<string, unknown>));
  }

  async findBySubmissionId(submissionId: string): Promise<FieldValue[]> {
    await connectToDatabase();
    const docs = await FieldValueModel.find({ submissionId }).lean();
    return docs.map(toEntity);
  }

  async updateMany(submissionId: string, updates: { fieldDefinitionId: string; data: UpdateFieldValueInput }[]): Promise<void> {
    await connectToDatabase();
    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { submissionId, fieldDefinitionId: update.fieldDefinitionId },
        update: { $set: update.data as Record<string, unknown> },
      },
    }));
    if (bulkOps.length > 0) {
      await FieldValueModel.bulkWrite(
        bulkOps as unknown as Parameters<typeof FieldValueModel.bulkWrite>[0]
      );
    }
  }

  async deleteBySubmissionId(submissionId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await FieldValueModel.deleteMany({ submissionId });
    return result.deletedCount > 0;
  }
}
