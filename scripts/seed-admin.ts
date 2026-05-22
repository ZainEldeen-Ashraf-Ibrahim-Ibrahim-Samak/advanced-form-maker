import { loadEnvConfig } from "@next/env";
import path from "path";

// 1. Use the official Next.js environment loader
const projectDir = process.cwd();
loadEnvConfig(projectDir);

// 2. Disable strict validation for this standalone process
process.env.SKIP_ENV_VALIDATION = "1";

// 3. Import dependencies DYNAMICALLY to avoid premature validation
async function run() {
  try {
    const { seedAdminUser } = await import("../src/lib/db-seed");
    const { connectToDatabase } = await import("../src/lib/db");
    const { logger } = await import("../src/lib/dev-logger");
    const mongoose = (await import("mongoose")).default;

    logger.info("--- Manual Admin Seeding Started ---");
    
    // Ensure we are connected
    await connectToDatabase();
    
    const result = await seedAdminUser();
    
    if (result.success) {
      logger.info(`SUCCESS: ${result.message}`);
    } else {
      logger.error(`FAILED to seed admin: ${(result as any).error?.message || "Unknown error"}`);
      process.exit(1);
    }
    
    // Gracefully close connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(0);
  } catch (error: any) {
    console.error(`Unexpected error during seeding: ${error?.message || "Unknown error"}`);
    process.exit(1);
  }
}

run();
