import {
  cacheGet,
  cacheInvalidate,
  cacheInvalidatePattern,
  CacheKeys,
  CacheTTL,
} from "@/lib/redis";

/**
 * Cache service implementing TTL-based caching with invalidation
 * per data-model.md cache key patterns.
 */
export const CacheService = {
  // ── Form Template Cache ──────────────────────────────────────────

  async getActiveForm<T>(compute: () => Promise<T>): Promise<T> {
    return cacheGet(CacheKeys.activeForm(), CacheTTL.FORM, compute);
  },

  async invalidateFormCache(): Promise<void> {
    await cacheInvalidate(CacheKeys.activeForm());
  },

  // ── Field Definition Cache ───────────────────────────────────────

  async getFields<T>(
    formTemplateId: string,
    compute: () => Promise<T>
  ): Promise<T> {
    return cacheGet(
      CacheKeys.fields(formTemplateId),
      CacheTTL.FIELDS,
      compute
    );
  },

  async invalidateFieldsCache(formTemplateId: string): Promise<void> {
    await cacheInvalidate(CacheKeys.fields(formTemplateId));
  },

  // ── Submission Cache ─────────────────────────────────────────────

  async getSubmissionsList<T>(
    status: string,
    page: number,
    compute: () => Promise<T>
  ): Promise<T> {
    return cacheGet(
      CacheKeys.submissionsList(status, page),
      CacheTTL.SUBMISSIONS_LIST,
      compute
    );
  },

  async getSubmissionsCounts<T>(compute: () => Promise<T>): Promise<T> {
    return cacheGet(
      CacheKeys.submissionsCounts(),
      CacheTTL.SUBMISSIONS_COUNTS,
      compute
    );
  },

  async getSubmission<T>(
    accessToken: string,
    compute: () => Promise<T>
  ): Promise<T> {
    return cacheGet(
      CacheKeys.submission(accessToken),
      CacheTTL.SUBMISSION,
      compute
    );
  },

  async invalidateSubmissionCache(accessToken?: string): Promise<void> {
    const keys: string[] = [CacheKeys.submissionsCounts()];

    if (accessToken) {
      keys.push(CacheKeys.submission(accessToken));
    }

    await cacheInvalidate(...keys);
    await cacheInvalidatePattern("submissions:list:*");
  },

  async invalidateAllSubmissionPayloadCache(): Promise<void> {
    await cacheInvalidate(CacheKeys.submissionsCounts());
    await cacheInvalidatePattern("submissions:list:*");
    await cacheInvalidatePattern("submission:*");
  },
};
