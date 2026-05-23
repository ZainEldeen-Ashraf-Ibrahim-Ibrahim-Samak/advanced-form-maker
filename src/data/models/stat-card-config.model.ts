import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IDashboardStatCard extends Document {
  slug: "total" | "pending" | "draft" | "viewed" | "needs_rewrite";
  visible: boolean;
  sortOrder: number;
  displayNameAr: string | null;
  displayNameEn: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const statCardConfigSchema = new Schema<IDashboardStatCard>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      enum: ["total", "pending", "draft", "viewed", "needs_rewrite"],
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
  },
  {
    timestamps: true,
    collection: "stat_card_configs",
  }
);

export const StatCardConfigModel: Model<IDashboardStatCard> =
  mongoose.models.StatCardConfig ||
  mongoose.model<IDashboardStatCard>("StatCardConfig", statCardConfigSchema);
