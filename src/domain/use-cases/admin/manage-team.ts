"use server";

import { auth } from "@/lib/auth";
import { getUserModel } from "@/data/models/user.model";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { EMAIL_REGEX, PHONE_REGEX } from "@/constants/constants";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can perform this action");
  }
  return session as { user: NonNullable<typeof session.user> & { id: string } };
}

export async function getTeamMembers() {
  await checkAdmin();
  const UserModel = await getUserModel();
  const users = await UserModel.find({}).sort({ createdAt: -1 }).lean();
  
  // Sanitize the user data before returning to client components
  return users.map((user) => ({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt?.toISOString(),
  }));
}

export async function createTeamMember(data: { name: string; email: string; phone?: string; role: "admin" | "user"; password?: string }) {
  try {
    await checkAdmin();
    const UserModel = await getUserModel();

    const normalizedEmail = normalizeEmail(data.email);
    const normalizedName = data.name.trim();
    const normalizedPhone = data.phone?.trim() || "";
    const rawPassword = data.password?.trim() || "password123";

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return { error: "Invalid email format" };
    }
    
    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      return { error: "Invalid phone number format" };
    }

    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return { error: "User with this email already exists" };
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newUser = await UserModel.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      role: data.role,
      password: hashedPassword,
    });

    // Convert to lean object to safely cross Server Boundary
    const safeUser = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
    };

    revalidatePath("/admin/team");
    
    return { data: safeUser };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to create team member" };
  }
}

export async function updateTeamMember(
  userId: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
  },
) {
  try {
    await checkAdmin();
    const UserModel = await getUserModel();

    const user = await UserModel.findById(userId);
    if (!user) {
      return { error: "User not found" };
    }

    const normalizedEmail = normalizeEmail(data.email);
    const normalizedName = data.name.trim();
    const normalizedPhone = data.phone?.trim() || "";

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return { error: "Invalid email format" };
    }

    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      return { error: "Invalid phone number format" };
    }

    const existingUser = await UserModel.findOne({
      email: normalizedEmail,
      _id: { $ne: userId },
    });
    if (existingUser) {
      return { error: "User with this email already exists" };
    }

    user.name = normalizedName;
    user.email = normalizedEmail;
    user.phone = normalizedPhone;

    const nextPassword = data.password?.trim();
    if (nextPassword) {
      user.password = await bcrypt.hash(nextPassword, 10);
    }

    await user.save();

    revalidatePath("/admin/team");

    return {
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      }
    };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to update team member" };
  }
}

export async function updateTeamMemberRole(userId: string, newRole: "admin" | "user") {
  try {
    const session = await checkAdmin();
    
    if (userId === session.user.id) {
      return { error: "You cannot change your own role" };
    }

    const UserModel = await getUserModel();
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return { error: "User not found" };
    }

    user.role = newRole;
    await user.save();

    revalidatePath("/admin/team");
    
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to update role" };
  }
}

export async function deleteTeamMember(userId: string) {
  try {
    const session = await checkAdmin();
    
    if (userId === session.user.id) {
      return { error: "You cannot delete your own account" };
    }

    const UserModel = await getUserModel();
    await UserModel.findByIdAndDelete(userId);

    revalidatePath("/admin/team");
    
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Failed to delete team member" };
  }
}
