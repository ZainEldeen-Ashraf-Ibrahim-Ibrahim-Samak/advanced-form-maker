export interface StorageUsageMetrics {
  storage: {
    usage: number; // in bytes
    limit: number; // in bytes
    used_percent: number; // 0-100
  };
  bandwidth: {
    usage: number;
    limit: number;
    used_percent: number;
  };
  requests: number;
}

export interface StorageRepository {
  /**
   * Retrieves current storage usage metrics from the provider.
   */
  getUsageMetrics(): Promise<StorageUsageMetrics>;

  /**
   * Deletes media associated with a specific target.
   * e.g. target="drafts" -> find media from draft submissions and delete from Cloudinary.
   */
  deleteMediaByTarget(target: "drafts" | "unused_media"): Promise<number>;
}
