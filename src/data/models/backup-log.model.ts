import mongoose, { Schema, Document } from "mongoose";

export interface IBackupLog extends Document {
  timestamp: Date;
  triggerType: "manual" | "cron";
  destination: "local" | "cloud" | "both";
  status: "success" | "failed";
  fileReferenceUrl?: string;
  fileSizeMb?: number;
  errorMessage?: string;
}

const BackupLogSchema = new Schema<IBackupLog>({
  timestamp: { type: Date, default: Date.now },
  triggerType: { type: String, enum: ["manual", "cron"], required: true },
  destination: { type: String, enum: ["local", "cloud", "both"], required: true },
  status: { type: String, enum: ["success", "failed"], required: true },
  fileReferenceUrl: { type: String },
  fileSizeMb: { type: Number },
  errorMessage: { type: String },
}, { timestamps: true });

export const BackupLogModel =
  mongoose.models.BackupLog ||
  mongoose.model<IBackupLog>("BackupLog", BackupLogSchema);
