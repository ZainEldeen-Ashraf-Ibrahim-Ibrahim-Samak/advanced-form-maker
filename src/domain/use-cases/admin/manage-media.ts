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
      // List all uploaded assets regardless of folder (submissions, media-library, etc.)
      const result = await cloudinary.api.resources({
        type: "upload",
        max_results: maxResults,
        next_cursor: nextCursor,
      });

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
