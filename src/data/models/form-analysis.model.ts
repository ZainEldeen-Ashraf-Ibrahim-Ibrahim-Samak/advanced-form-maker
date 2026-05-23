import mongoose, { Schema, Document } from "mongoose";

export interface IFormAnalysis extends Document {
  formTemplateId: mongoose.Types.ObjectId;
  enabled: boolean;
  summary: string | null;
  patterns: string[];
  findings: string[];
  sentimentOverview: string | null;
  analyzedAt: Date | null;
  submissionCount: number;
  topAnswers: Array<{ fieldLabel: string; topValue: string; count: number }> | null;
  submissionDateRange: { earliest: Date; latest: Date } | null;
  analysisStatus: "idle" | "running" | "done" | "failed";
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const FormAnalysisSchema = new Schema<IFormAnalysis>({
  formTemplateId: { type: Schema.Types.ObjectId, ref: "FormTemplate", required: true, unique: true, index: true },
  enabled: { type: Boolean, default: true },
  summary: { type: String, default: null },
  patterns: { type: [String], default: [] },
  findings: { type: [String], default: [] },
  sentimentOverview: { type: String, default: null },
  analyzedAt: { type: Date, default: null },
  submissionCount: { type: Number, default: 0 },
  topAnswers: {
    type: [{ fieldLabel: String, topValue: String, count: Number }],
    default: null
  },
  submissionDateRange: {
    type: { earliest: Date, latest: Date },
    default: null
  },
  analysisStatus: { type: String, enum: ["idle", "running", "done", "failed"], default: "idle" },
  errorMessage: { type: String, default: null },
}, {
  timestamps: true,
});

export const FormAnalysisModel =
  mongoose.models.FormAnalysis ||
  mongoose.model<IFormAnalysis>("FormAnalysis", FormAnalysisSchema);
