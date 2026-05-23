import mongoose, { Schema, Document } from "mongoose";

export interface ISettingsConfiguration extends Document {
  environmentVersion: string;
  backup: {
    destination: "local" | "cloud" | "both";
    active: boolean;
    lastRunAt: Date | null;
  };
  cron: {
    activeInterval: "minutely" | "hourly" | "daily" | "monthly" | "none";
    timezone: string;
  };
  draft_retention_days?: number | null;
  cloudinary_storage_threshold?: number | null;
  storage_cleanup_target?: string | null;
  branding?: {
    siteName: string;
    siteLogoUrl: string;
  };
  updatedAt: Date;
  updatedBy: string;
}

const SettingsConfigurationSchema = new Schema<ISettingsConfiguration>({
  environmentVersion: { type: String, required: true, default: "1.0.0" },
  backup: {
    destination: { type: String, enum: ["local", "cloud", "both"], default: "local" },
    active: { type: Boolean, default: true },
    lastRunAt: { type: Date, default: null },
  },
  cron: {
    activeInterval: { type: String, enum: ["minutely", "hourly", "daily", "monthly", "none"], default: "none" },
    timezone: { type: String, default: "UTC" },
  },
  draft_retention_days: { type: Number, default: null, min: 0 },
  cloudinary_storage_threshold: { type: Number, default: null, min: 1, max: 100 },
  storage_cleanup_target: { type: String, enum: ["drafts", "unused_media", null], default: null },
  branding: {
    siteName: { type: String, default: "SCCT DAMAGES", maxlength: 100 },
    siteLogoUrl: { type: String, default: "", maxlength: 500 },
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, required: true },
}, {
  timestamps: true,
});

export const SettingsConfigurationModel =
  mongoose.models.SettingsConfiguration ||
  mongoose.model<ISettingsConfiguration>("SettingsConfiguration", SettingsConfigurationSchema);
