import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const sourceEnvPath = path.resolve(rootDir, ".env.local");
const mobileEnvPath = path.resolve(rootDir, "mobile-shell", ".env");

function parseEnv(content: string): Map<string, string> {
  const values = new Map<string, string>();
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }

    let value = rawValue;
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
  }

  return values;
}

function firstNonEmpty(
  env: Map<string, string>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = env.get(key)?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

function hostFromUrl(rawUrl: string): string | undefined {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname || undefined;
  } catch {
    return undefined;
  }
}

function main(): void {
  if (!fs.existsSync(sourceEnvPath)) {
    throw new Error(".env.local was not found in the repository root.");
  }

  const sourceText = fs.readFileSync(sourceEnvPath, "utf8");
  const sourceEnv = parseEnv(sourceText);

  const appBaseUrl = firstNonEmpty(sourceEnv, [
    "MOBILE_APP_BASE_URL",
    "API_ORIGIN",
    "NEXT_PUBLIC_APP_URL",
  ]);

  if (!appBaseUrl) {
    throw new Error(
      "Missing MOBILE_APP_BASE_URL/API_ORIGIN/NEXT_PUBLIC_APP_URL in .env.local.",
    );
  }

  const derivedHost = hostFromUrl(appBaseUrl);
  if (!derivedHost) {
    throw new Error(
      "Could not derive host from app base URL in .env.local. Use a full https URL.",
    );
  }

  const allowedHosts =
    firstNonEmpty(sourceEnv, ["MOBILE_ALLOWED_HOSTS"]) ?? derivedHost;

  const mobileRuntime = new Map<string, string>([
    ["MOBILE_APP_BASE_URL", appBaseUrl],
    ["MOBILE_ALLOWED_HOSTS", allowedHosts],
    [
      "MOBILE_DEFAULT_LOCALE",
      firstNonEmpty(sourceEnv, ["MOBILE_DEFAULT_LOCALE"]) ?? "ar",
    ],
    [
      "MOBILE_SUPPORTED_LOCALES",
      firstNonEmpty(sourceEnv, ["MOBILE_SUPPORTED_LOCALES"]) ?? "ar,en",
    ],
    [
      "MOBILE_SPLASH_MIN_DURATION_MS",
      firstNonEmpty(sourceEnv, ["MOBILE_SPLASH_MIN_DURATION_MS"]) ?? "1200",
    ],
    [
      "MOBILE_SCAN_TIMEOUT_MS",
      firstNonEmpty(sourceEnv, ["MOBILE_SCAN_TIMEOUT_MS"]) ?? "10000",
    ],
    [
      "MOBILE_SUBMISSION_PATH_SEGMENT",
      firstNonEmpty(sourceEnv, ["MOBILE_SUBMISSION_PATH_SEGMENT"]) ?? "submit",
    ],
    ["PUSHER_KEY", firstNonEmpty(sourceEnv, ["PUSHER_KEY"]) ?? ""],
    ["PUSHER_CLUSTER", firstNonEmpty(sourceEnv, ["PUSHER_CLUSTER"]) ?? "mt1"],
    [
      "MOBILE_API_TIMEOUT_MS",
      firstNonEmpty(sourceEnv, ["MOBILE_API_TIMEOUT_MS"]) ?? "15000",
    ],
    [
      "MOBILE_DRAFT_AUTOSAVE_DEBOUNCE_MS",
      firstNonEmpty(sourceEnv, ["MOBILE_DRAFT_AUTOSAVE_DEBOUNCE_MS"]) ?? "450",
    ],
    ["API_ORIGIN", appBaseUrl],
    ["NEXT_PUBLIC_APP_URL", appBaseUrl],
  ]);

  const output = [
    "# Auto-generated from ../.env.local",
    "# This file only contains non-secret runtime values needed by mobile-shell.",
    ...Array.from(mobileRuntime.entries()).map(([key, value]) => `${key}=${value}`),
    "",
  ].join("\n");

  fs.writeFileSync(mobileEnvPath, output, "utf8");
  console.log(`Updated ${path.relative(rootDir, mobileEnvPath)} from .env.local`);
}

main();
