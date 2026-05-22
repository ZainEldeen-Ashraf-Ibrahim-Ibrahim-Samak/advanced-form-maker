import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "@/lib/db";

export interface IUser extends Document {
  email: string;
  name: string;
  image?: string | null;
  phone?: string;
  password?: string;
  role: "admin" | "user";
  languagePreference: "en" | "ar";
  themePreference: "light" | "dark";
  emailVerified?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      select: false, // Never returned by default
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      required: true,
    },
    languagePreference: {
      type: String,
      enum: ["en", "ar"],
      default: "ar",
    },
    themePreference: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },
    emailVerified: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Ensure connection before using model
async function getModel(): Promise<Model<IUser>> {
  await connectToDatabase();
  return mongoose.models.User || mongoose.model<IUser>("User", userSchema);
}

// For cases where we can guarantee connection is already established
export const UserModel =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);

export { getModel as getUserModel };
