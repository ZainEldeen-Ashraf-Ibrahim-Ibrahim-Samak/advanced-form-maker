import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { SystemRepository } from "@/domain/repositories/system-repository";
import { logger } from "@/lib/dev-logger";

export class MongoSystemRepository implements SystemRepository {
  async generateBackup(): Promise<Record<string, any[]>> {
    try {
      await connectToDatabase();
      const backupData: Record<string, any[]> = {};
      
      const modelNames = mongoose.modelNames();
      logger.info(`Starting system backup. Collections found: ${modelNames.length}`);
      
      for (const modelName of modelNames) {
        const Model = mongoose.model(modelName);
        const docs = await Model.find({}).lean().exec();
        backupData[modelName] = docs;
      }
      
      return backupData;
    } catch (error) {
      logger.error("Failed to generate backup", error);
      throw error;
    }
  }

  async restoreBackup(data: Record<string, any[]>): Promise<void> {
    try {
      await connectToDatabase();
      
      // Note: MongoDB Transactions require a replica set. 
      // If the environment does not support it (e.g. standalone MongoDB for local dev),
      // we might just run standard operations.
      // We will attempt to use a transaction if possible.
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const modelNames = mongoose.modelNames();
        
        // Ensure all provided models exist in current connection
        for (const [modelName, docs] of Object.entries(data)) {
          if (!modelNames.includes(modelName)) {
            logger.warn(`Model ${modelName} found in backup but not registered in current mongoose instance. Skipping.`);
            continue;
          }
          
          const Model = mongoose.model(modelName);
          
          // Clear current collection
          await Model.deleteMany({}, { session });
          
          // Insert backup documents
          if (Array.isArray(docs) && docs.length > 0) {
            await Model.insertMany(docs, { session });
          }
        }

        await session.commitTransaction();
        logger.info("System restore completed successfully.");
      } catch (error) {
        await session.abortTransaction();
        logger.error("Transaction failed during system restore. Rolled back.", error);
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      logger.error("Failed to restore backup", error);
      throw error;
    }
  }
}
