import { UserRepository } from "@/domain/repositories/user-repository";
import { User, UpdateUserInput } from "@/domain/entities/user";
import { UserModel } from "@/data/models/user.model";
import { connectToDatabase } from "@/lib/db";

function toUser(doc: Record<string, unknown>): User {
  return {
    id: doc._id?.toString() ?? "",
    email: doc.email as string,
    name: doc.name as string,
    image: (doc.image as string) ?? null,
    role: (doc.role as "admin") ?? "admin",
    languagePreference:
      (doc.languagePreference as "en" | "ar") ?? "en",
    themePreference:
      (doc.themePreference as "light" | "dark") ?? "light",
    emailVerified: (doc.emailVerified as Date) ?? null,
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export class MongoUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    await connectToDatabase();
    const doc = await UserModel.findById(id).lean();
    return doc ? toUser(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    await connectToDatabase();
    const doc = await UserModel.findOne({
      email: email.toLowerCase(),
    }).lean();
    return doc ? toUser(doc) : null;
  }

  async findByEmailWithPassword(
    email: string
  ): Promise<(User & { password?: string }) | null> {
    await connectToDatabase();
    const doc = await UserModel.findOne({
      email: email.toLowerCase(),
    })
      .select("+password")
      .lean();
    if (!doc) return null;
    return {
      ...toUser(doc),
      password: doc.password,
    };
  }

  async updatePreferences(
    id: string,
    input: UpdateUserInput
  ): Promise<User | null> {
    await connectToDatabase();
    const doc = await UserModel.findByIdAndUpdate(id, input, {
      new: true,
    }).lean();
    return doc ? toUser(doc) : null;
  }
}
