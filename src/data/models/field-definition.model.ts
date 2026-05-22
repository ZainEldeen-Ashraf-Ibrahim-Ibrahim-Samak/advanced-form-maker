import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IFieldDefinition extends Document {
  formTemplateId: mongoose.Types.ObjectId;
  nameEn: string;
  nameAr: string;
  inputType: "text" | "number" | "image" | "file" | "date" | "dropdown";
  validationRules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    maxFileSize?: number;
    allowedFileTypes?: string[];
  };
  isMultiple: boolean;
  dropdownOptionsEn: string[];
  dropdownOptionsAr: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fieldDefinitionSchema = new Schema<IFieldDefinition>(
  {
    formTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "FormTemplate",
      required: true,
    },
    nameEn: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    inputType: {
      type: String,
      required: true,
      enum: ["text", "number", "image", "file", "date", "dropdown"],
    },
    validationRules: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isMultiple: {
      type: Boolean,
      default: false,
    },
    dropdownOptionsEn: {
      type: [String],
      default: [],
    },
    dropdownOptionsAr: {
      type: [String],
      default: [],
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "field_definitions",
  }
);

// Compound indexes per data-model.md
fieldDefinitionSchema.index({ formTemplateId: 1, sortOrder: 1 });
fieldDefinitionSchema.index({ formTemplateId: 1, isActive: 1 });

export const FieldDefinitionModel: Model<IFieldDefinition> =
  mongoose.models.FieldDefinition ||
  mongoose.model<IFieldDefinition>("FieldDefinition", fieldDefinitionSchema);
