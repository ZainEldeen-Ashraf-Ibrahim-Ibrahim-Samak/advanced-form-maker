import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IFieldValue extends Document {
  submissionId: mongoose.Types.ObjectId;
  fieldDefinitionId: mongoose.Types.ObjectId;
  fieldNameSnapshot: string;
  fieldTypeSnapshot: string;
  value?: mongoose.Schema.Types.Mixed;
  mediaUrl?: string | null;
  mediaPublicId?: string | null;
  mediaItems?: { url: string; publicId: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const fieldValueSchema = new Schema<IFieldValue>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: "Submission", required: true, index: true },
    fieldDefinitionId: { type: Schema.Types.ObjectId, ref: "FieldDefinition", required: true },
    fieldNameSnapshot: { type: String, required: true },
    fieldTypeSnapshot: { type: String, required: true },
    value: { type: Schema.Types.Mixed, default: null },
    mediaUrl: { type: String, default: null },
    mediaPublicId: { type: String, default: null },
    mediaItems: [{
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    }],
  },
  {
    timestamps: true,
    collection: "field_values",
  }
);

// Compound unique index ensuring one value per field per submission
fieldValueSchema.index({ submissionId: 1, fieldDefinitionId: 1 }, { unique: true });

export const FieldValueModel: Model<IFieldValue> =
  mongoose.models.FieldValue ||
  mongoose.model<IFieldValue>("FieldValue", fieldValueSchema);
