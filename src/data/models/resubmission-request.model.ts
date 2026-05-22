import mongoose, { Schema, type Document, type Model } from "mongoose";
import { ResubmissionRequestStatus } from "@/domain/entities/submission";

export interface IResubmissionRequest extends Document {
  id: string;
  submissionId: mongoose.Types.ObjectId;
  targetAccessToken: string;
  requestedByAdminId: mongoose.Types.ObjectId;
  requestedByAdminName: string;
  comment?: string;
  status: ResubmissionRequestStatus;
  createdAt: Date;
  expiresAt: Date;
  deliveredAt?: Date | null;
  seenAt?: Date | null;
}

const resubmissionRequestSchema = new Schema<IResubmissionRequest>(
  {
    id: { type: String, required: true, unique: true },
    submissionId: { type: Schema.Types.ObjectId, ref: "Submission", required: true, index: true },
    targetAccessToken: { type: String, required: true, index: true },
    requestedByAdminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedByAdminName: { type: String, required: true },
    comment: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending_delivery", "delivered", "seen", "expired"],
      required: true,
      default: "pending_delivery",
      index: true,
    },
    createdAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    deliveredAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "resubmission_requests",
  }
);

// TTL index to automatically remove if expired or we handle it lazily.
// Actually, data-model says "expiration processing can be lazy-evaluated".

export const ResubmissionRequestModel: Model<IResubmissionRequest> =
  mongoose.models.ResubmissionRequest ||
  mongoose.model<IResubmissionRequest>("ResubmissionRequest", resubmissionRequestSchema);
