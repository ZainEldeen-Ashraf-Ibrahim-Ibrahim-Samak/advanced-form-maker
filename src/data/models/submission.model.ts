import mongoose, { Schema, type Document, type Model } from "mongoose";
import { SubmissionStatus } from "@/domain/entities/submission";

export interface IAuditEntry {
  oldStatus: SubmissionStatus;
  newStatus: SubmissionStatus;
  comment?: string;
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  timestamp: Date;
}

export interface ISubmission extends Document {
  accessToken: string;
  formTemplateId: mongoose.Types.ObjectId;
  clientName: string;
  clientContact: string;
  status: SubmissionStatus;
  rewriteComment: string;
  contactRecords: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    contact?: string;
    role?: string;
    notes?: string;
    mediaUrl?: string;
    mediaPublicId?: string;
  }>;
  formSnapshot: Record<string, unknown>[]; // Frozen representation of FieldDefinitions
  auditTrail: IAuditEntry[];
  resubmissionRequest?: {
    id: string;
    targetAccessToken: string;
    requestedByAdminId: mongoose.Types.ObjectId;
    requestedByAdminName: string;
    comment?: string;
    status: "pending_delivery" | "delivered" | "seen" | "expired";
    createdAt: Date;
    expiresAt: Date;
    deliveredAt?: Date | null;
    seenAt?: Date | null;
  } | null;
  submittedAt: Date;
  lastResubmittedAt?: Date | null;
  updatedAt: Date;
}

const auditEntrySchema = new Schema<IAuditEntry>(
  {
    oldStatus: { type: String, required: true },
    newStatus: { type: String, required: true },
    comment: { type: String },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    adminName: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const formSnapshotItemSchema = new Schema<Record<string, unknown>>({}, { _id: false, strict: false });

const contactRecordSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, default: "", trim: true, maxlength: 200 },
    phone: { type: String, default: "", trim: true, maxlength: 50 },
    contact: { type: String, default: "", trim: true, maxlength: 200 },
    role: { type: String, default: "", trim: true, maxlength: 100 },
    notes: { type: String, default: "", trim: true, maxlength: 1000 },
    mediaUrl: { type: String, default: "" },
    mediaPublicId: { type: String, default: "" },
  },
  { _id: false }
);

const resubmissionRequestSchema = new Schema(
  {
    id: { type: String, required: true },
    targetAccessToken: { type: String, required: true },
    requestedByAdminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedByAdminName: { type: String, required: true },
    comment: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending_delivery", "delivered", "seen", "expired"],
      required: true,
      default: "pending_delivery",
    },
    createdAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    deliveredAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
  },
  { _id: false }
);

const submissionSchema = new Schema<ISubmission>(
  {
    accessToken: { type: String, required: true, unique: true },
    formTemplateId: { type: Schema.Types.ObjectId, ref: "FormTemplate", required: true, index: true },
    clientName: { type: String, default: "", trim: true, maxlength: 200 },
    clientContact: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["draft", "pending", "viewed", "needs_rewrite"],
      default: "pending",
      required: true,
    },
    rewriteComment: { type: String, default: "" },
    contactRecords: { type: [contactRecordSchema], default: [] },
    formSnapshot: { type: [formSnapshotItemSchema], required: true },
    auditTrail: [auditEntrySchema],
    resubmissionRequest: { type: resubmissionRequestSchema, default: null },
    submittedAt: { type: Date, default: Date.now },
    lastResubmittedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "submissions",
  }
);

// Compound index for admin dashboard filtering and sorting
submissionSchema.index({ status: 1, submittedAt: -1 });

export const SubmissionModel: Model<ISubmission> =
  mongoose.models.Submission ||
  mongoose.model<ISubmission>("Submission", submissionSchema);
