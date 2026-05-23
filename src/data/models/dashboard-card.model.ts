import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IDashboardCard extends Document {
  formTemplateId: mongoose.Types.ObjectId;
  visible: boolean;
  sortOrder: number;
  displayName: string | null;
  metricLabel: string | null;
  metricValue: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const dashboardCardSchema = new Schema<IDashboardCard>(
  {
    formTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "FormTemplate",
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
    displayName: {
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
  },
  {
    timestamps: true,
    collection: "dashboard_cards",
  }
);

export const DashboardCardModel: Model<IDashboardCard> =
  mongoose.models.DashboardCard ||
  mongoose.model<IDashboardCard>("DashboardCard", dashboardCardSchema);
