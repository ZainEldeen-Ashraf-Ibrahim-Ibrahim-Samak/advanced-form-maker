export interface AiQuotaError {
  isQuota: true;
  retrySeconds: number | null;
}

export interface AiOtherError {
  isQuota: false;
  retrySeconds: null;
}

export type AiErrorInfo = AiQuotaError | AiOtherError;

export function parseAiErrorMessage(msg: string | null | undefined): AiErrorInfo {
  if (!msg) return { isQuota: false, retrySeconds: null };

  if (!msg.startsWith("AI_QUOTA_EXCEEDED")) {
    return { isQuota: false, retrySeconds: null };
  }

  const parts = msg.split(":");
  const raw = parts[1] ? parseInt(parts[1], 10) : NaN;
  const retrySeconds = isNaN(raw) ? null : raw;
  return { isQuota: true, retrySeconds };
}

/** Format seconds as MM:SS countdown string */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${s}s`;
}
