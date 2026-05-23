export interface GeminiErrorInfo {
  isQuotaError: boolean;
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
  const status: number = error?.status ?? error?.response?.status ?? 0;

  const isQuota =
    status === 429 ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.toLowerCase().includes("quota");

  if (!isQuota) {
    return { isQuotaError: false, retryAfterSeconds: null, cleanMessage: msg };
  }

  const retryAfterSeconds = extractRetrySeconds(error);
  const cleanMessage = retryAfterSeconds !== null
    ? `AI_QUOTA_EXCEEDED:${retryAfterSeconds}`
    : "AI_QUOTA_EXCEEDED";

  return { isQuotaError: true, retryAfterSeconds, cleanMessage };
}
