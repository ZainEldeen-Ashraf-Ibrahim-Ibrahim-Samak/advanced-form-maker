import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IDashboardStatCard extends Document {
  slug: string;
  visible: boolean;
  sortOrder: number;
  displayNameAr: string | null;
  displayNameEn: string | null;
  logoUrl: string | null;
  metricLabel: string | null;
  metricValue: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const statCardConfigSchema = new Schema<IDashboardStatCard>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    visible: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    displayNameAr: {
      type: String,
      default: null,
    },
    displayNameEn: {
      type: String,
      default: null,
    },
    logoUrl: {
      type: String,
      default: null,
    },
    metricLabel: {
      type: String,
      default: null,
    },
    metricValue: {
      type: String,
      default: null,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "stat_card_configs",
  }
);

export const StatCardConfigModel: Model<IDashboardStatCard> =
  mongoose.models.StatCardConfig ||
  mongoose.model<IDashboardStatCard>("StatCardConfig", statCardConfigSchema);
