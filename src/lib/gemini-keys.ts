import { env } from "@/env.mjs";

/**
 * Collects all configured Gemini API keys, in priority order. When the
 * current key hits its quota limit, callers should fall back to the next
 * configured key instead of failing outright.
 */
export const getAiEnvs = (): string[] => {
  const keys = [
    env.GEMINI_API_KEY,
    env.GEMINI_API_KEY_2,
    env.GEMINI_API_KEY_3,
    env.GEMINI_API_KEY_4,
  ].filter((key): key is string => !!key);

  if (keys.length === 0) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }
  return keys;
};
