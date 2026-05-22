import { v2 as cloudinary } from "cloudinary";
import { env } from "@/env.mjs";
import { logger } from "@/lib/dev-logger";

export class ManageMediaUseCase {
  constructor() {
    if (env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  }

  async getMediaFiles(nextCursor?: string, maxResults = 30) {
    try {
      // Use search API for better filtering if available, or resources listing.
      // Search allows multiple resource types but needs indexing enabled.
      // We will try listing resources in 'submissions' folder.
      
      const result = await cloudinary.api.resources({
        type: "upload",
        prefix: "submissions", // No trailing slash sometimes works better/different
        max_results: maxResults,
        next_cursor: nextCursor,
      });

      // If no results in prefix, try without prefix to see if data exists elsewhere
      if (result.resources.length === 0 && !nextCursor) {
        const globalResult = await cloudinary.api.resources({
          type: "upload",
          max_results: maxResults,
        });
        return {
          resources: globalResult.resources,
          next_cursor: globalResult.next_cursor
        };
      }

      return {
        resources: result.resources,
        next_cursor: result.next_cursor
      };
    } catch (error) {
      logger.error("Failed to fetch Cloudinary media files", error);
      throw error;
    }
  }

  async deleteMediaFile(publicId: string) {
    try {
      // First try as image
      let result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      
      // If failed, try as raw
      if (result.result !== "ok") {
        result = await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
      }
      
      return result;
    } catch (error) {
      logger.error(`Failed to delete Cloudinary media file: ${publicId}`, error);
      throw error;
    }
  }
}
