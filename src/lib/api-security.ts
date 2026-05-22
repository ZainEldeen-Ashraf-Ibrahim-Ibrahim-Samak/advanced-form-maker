type MaliciousPattern = {
  name: string;
  regex: RegExp;
};

type MaliciousMatch = {
  path: string;
  rule: string;
};

const MALICIOUS_PATTERNS: MaliciousPattern[] = [
  { name: "script-tag", regex: /<\s*script\b/i },
  { name: "javascript-protocol", regex: /javascript\s*:/i },
  { name: "data-html", regex: /data\s*:\s*text\/html/i },
  { name: "inline-event-handler", regex: /on[a-z]+\s*=/i },
  { name: "iframe-tag", regex: /<\s*iframe\b/i },
  { name: "object-tag", regex: /<\s*object\b/i },
  { name: "embed-tag", regex: /<\s*embed\b/i },
  { name: "svg-script", regex: /<\s*svg[^>]*>/i },
];

const MAX_SCAN_DEPTH = 8;

function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function scanString(value: string, path: string): MaliciousMatch | null {
  const normalized = decodeSafely(value);
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.regex.test(normalized)) {
      return { path, rule: pattern.name };
    }
  }
  return null;
}

function scanUnknown(value: unknown, path: string, depth: number): MaliciousMatch | null {
  if (depth > MAX_SCAN_DEPTH) {
    return null;
  }

  if (typeof value === "string") {
    return scanString(value, path);
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = scanUnknown(value[i], `${path}[${i}]`, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const [key, nested] of Object.entries(record)) {
      const keyThreat = scanString(key, `${path}.<key>`);
      if (keyThreat) return keyThreat;

      const found = scanUnknown(nested, `${path}.${key}`, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

export function detectMaliciousContent(value: unknown, rootPath = "payload"): MaliciousMatch | null {
  return scanUnknown(value, rootPath, 0);
}

export type SecureJsonParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: "INVALID_JSON" | "MALICIOUS_CONTENT_DETECTED" };

export async function parseSecureJson<T = Record<string, unknown>>(
  request: Request,
): Promise<SecureJsonParseResult<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      error: "Invalid JSON payload",
      code: "INVALID_JSON",
    };
  }

  const threat = detectMaliciousContent(body);
  if (threat) {
    return {
      success: false,
      error: `Potential malicious input detected at ${threat.path} (${threat.rule})`,
      code: "MALICIOUS_CONTENT_DETECTED",
    };
  }

  return { success: true, data: body as T };
}
