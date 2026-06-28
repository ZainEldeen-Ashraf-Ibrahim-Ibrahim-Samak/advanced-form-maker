import mongoose, { Schema, type Document, type Model } from "mongoose";
import { DEFAULT_CONTACT_FORM_FIELDS } from "@/lib/contact-form";

export interface IFormTemplate extends Document {
  name: string;
  description: string;
  contactFormLocked: boolean;
  contactRecords: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    contact?: string;
    role?: string;
    notes?: string;
  }>;
  contactFormFields: Array<{
    id: string;
    key: "name" | "email" | "phone" | "address";
    labelEn: string;
    labelAr: string;
    label: string;
    placeholderEn: string;
    placeholderAr: string;
    placeholder: string;
    required: boolean;
    sortOrder: number;
  }>;
  isActive: boolean;
  isLocked: boolean;
  isContactForm: boolean;
  aiAutoFillEnabled: boolean;
  canAddMoreReplies: boolean;
  multiInstanceEnabled: boolean;
  maxInstances: number | null;
  createdAt: Date;
  updatedAt: Date;
}


const contactRecordSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, default: "", trim: true, maxlength: 200 },
    phone: { type: String, default: "", trim: true, maxlength: 50 },
    contact: { type: String, default: "", trim: true, maxlength: 200 },
    role: { type: String, default: "", trim: true, maxlength: 100 },
    notes: { type: String, default: "", trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const contactFormFieldSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    key: {
      type: String,
      required: true,
      enum: ["name", "email", "phone", "address"],
    },
    labelEn: { type: String, required: true, trim: true, maxlength: 200 },
    labelAr: { type: String, required: true, trim: true, maxlength: 200 },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    placeholderEn: { type: String, default: "", trim: true, maxlength: 200 },
    placeholderAr: { type: String, default: "", trim: true, maxlength: 200 },
    placeholder: { type: String, default: "", trim: true, maxlength: 200 },
    required: { type: Boolean, default: false },
    sortOrder: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const formTemplateSchema = new Schema<IFormTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    contactRecords: {
      type: [contactRecordSchema],
      default: [{ id: "primary", name: "Primary Contact", email: "", phone: "", role: "", notes: "" }],
    },
    contactFormFields: {
      type: [contactFormFieldSchema],
      default: DEFAULT_CONTACT_FORM_FIELDS,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    isContactForm: {
      type: Boolean,
      default: false,
      index: true,
    },
    aiAutoFillEnabled: {
      type: Boolean,
      default: false,
    },
    canAddMoreReplies: {
      type: Boolean,
      default: false,
    },
    multiInstanceEnabled: {
      type: Boolean,
      default: false,
    },
    maxInstances: {
      type: Number,
      default: null,
    },
    contactFormLocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "form_templates",
  }
);

export const FormTemplateModel: Model<IFormTemplate> =
  mongoose.models.FormTemplate ||
  mongoose.model<IFormTemplate>("FormTemplate", formTemplateSchema);
