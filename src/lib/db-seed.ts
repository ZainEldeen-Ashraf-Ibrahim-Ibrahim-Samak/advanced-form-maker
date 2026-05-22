import { UserModel } from "@/data/models/user.model";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/dev-logger";

/**
 * Initializes the default admin user if the user collection is empty.
 */
export async function seedAdminUser() {
  try {
    const userCount = await UserModel.countDocuments();
    
    if (userCount > 0) {
      return { success: true, message: "Database already initialized." };
    }

    logger.info("No users found. Initializing default admin...");

    const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || "admin123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const adminUser = await UserModel.create({
      email: "admin@scct.local",
      name: "System Admin",
      password: hashedPassword,
      role: "admin",
      languagePreference: "ar",
      themePreference: "dark",
      emailVerified: new Date(),
    });

    logger.info(`✅ Default admin created: ${adminUser.email}`);
    logger.warn(`⚠️ IMPORTANT: Default password is set to "${defaultPassword}". Please change it upon login.`);

    return { 
      success: true, 
      message: "Admin user created successfully.",
      user: { email: adminUser.email }
    };
  } catch (error) {
    logger.error("Failed to seed admin user", error);
    return { success: false, error };
  }
}
