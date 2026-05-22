/**
 * Sanitizes free-text input in a server-safe way without DOM/browser dependencies.
 * It strips tags, removes control characters, and normalizes whitespace.
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return "";

  return input
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
