export interface GeminiErrorInfo {
  isQuotaError: boolean;
  /** True for quota errors AND transient server-side errors (503/UNAVAILABLE
   * "high demand", 500/INTERNAL) — worth retrying with the next API key
   * rather than failing immediately, since these are rarely tied to which
   * key was used. */
  isRetryable: boolean;
  retryAfterSeconds: number | null;
  /** Clean error code to store/return: "AI_QUOTA_EXCEEDED:59" or "AI_QUOTA_EXCEEDED" */
  cleanMessage: string;
}

function extractRetrySeconds(error: any): number | null {
  // 1. Check SDK-level details array
  const details: any[] = error?.details ?? error?.error?.details ?? [];
  for (const detail of details) {
    if (detail?.retryDelay) {
      const match = String(detail.retryDelay).match(/(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
  }

  // 2. The SDK sometimes wraps the full JSON inside error.message
  const msg: string = error?.message ?? "";
  if (msg.includes("retryDelay")) {
    try {
      const jsonMatch = msg.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const nested: any[] = parsed?.error?.details ?? [];
        for (const d of nested) {
          if (d?.retryDelay) {
            const match = String(d.retryDelay).match(/(\d+)/);
            if (match) return parseInt(match[1], 10);
          }
        }
      }
    } catch {
      // ignore parse failures
    }
  }

  // 3. "Please retry in 59.57s" pattern in the message text
  const retryMatch = msg.match(/retry.*?(\d+)[\.\d]*\s*s/i);
  if (retryMatch) return parseInt(retryMatch[1], 10);

  return null;
}

export function parseGeminiError(error: any): GeminiErrorInfo {
  const msg: string = error?.message ?? "";
  const lowerMsg = msg.toLowerCase();
  const status: number = error?.status ?? error?.response?.status ?? 0;

  const isQuota =
    status === 429 ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    lowerMsg.includes("quota");

  // "High demand"/UNAVAILABLE and transient 5xx errors aren't quota-specific,
  // but are just as worth retrying against the next configured API key —
  // model-level overload isn't tied to which key made the request.
  const isTransientServerError =
    status === 503 ||
    status === 500 ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    lowerMsg.includes("high demand") ||
    lowerMsg.includes("overloaded");

  if (!isQuota) {
    return {
      isQuotaError: false,
      isRetryable: isTransientServerError,
      retryAfterSeconds: null,
      cleanMessage: msg,
    };
  }

  const retryAfterSeconds = extractRetrySeconds(error);
  const cleanMessage = retryAfterSeconds !== null
    ? `AI_QUOTA_EXCEEDED:${retryAfterSeconds}`
    : "AI_QUOTA_EXCEEDED";

  return { isQuotaError: true, isRetryable: true, retryAfterSeconds, cleanMessage };
}
