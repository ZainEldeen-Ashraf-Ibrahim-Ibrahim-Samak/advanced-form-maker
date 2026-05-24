import { env } from "@/env.mjs";
import { logger } from "@/lib/dev-logger";

type HttpMethod = "GET" | "POST";

type TestCase = {
  name: string;
  method: HttpMethod;
  path: string;
  expectedStatus: number;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  expectErrorCode?: string;
};

type JsonObject = Record<string, unknown>;

function getBaseUrl(): string {
  const base = env.NEXT_PUBLIC_APP_URL ?? "";
  return base.replace(/\/$/, "");
}

function toJsonObject(value: unknown): JsonObject {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as JsonObject;
  }

  return {};
}

async function runTest(baseUrl: string, testCase: TestCase): Promise<boolean> {
  const url = `${baseUrl}${testCase.path}`;

  try {
    const response = await fetch(url, {
      method: testCase.method,
      headers: {
        "Content-Type": "application/json",
        ...(testCase.headers ?? {}),
      },
      body: testCase.body ? JSON.stringify(testCase.body) : undefined,
    });

    const json = toJsonObject(await response.json().catch(() => ({})));
    const statusMatch = response.status === testCase.expectedStatus;

    let errorCodeMatch = true;
    if (testCase.expectErrorCode) {
      errorCodeMatch = json.code === testCase.expectErrorCode;
    }

    const pass = statusMatch && errorCodeMatch;
    if (pass) {
      logger.info(`PASS: ${testCase.name}`, { status: response.status, path: testCase.path });
    } else {
      logger.error(`FAIL: ${testCase.name}`, {
        expectedStatus: testCase.expectedStatus,
        actualStatus: response.status,
        expectedCode: testCase.expectErrorCode,
        actualCode: json.code,
        path: testCase.path,
        body: json,
      });
    }

    return pass;
  } catch (error) {
    logger.error(`FAIL: ${testCase.name}`, { path: testCase.path, error });
    return false;
  }
}

async function main() {
  const baseUrl = getBaseUrl();

  logger.info("Running API smoke tests", { baseUrl });

  const tests: TestCase[] = [
    {
      name: "Backups cron rejects invalid token",
      method: "GET",
      path: "/api/admin/backups",
      expectedStatus: 401,
      headers: { Authorization: "Bearer invalid-cron-token" },
      expectErrorCode: "UNAUTHORIZED",
    },
    {
      name: "Cloudinary sign rejects missing timestamp",
      method: "POST",
      path: "/api/cloudinary/sign",
      expectedStatus: 400,
      body: {},
      expectErrorCode: "BAD_REQUEST",
    },
    {
      name: "Admin forms requires auth",
      method: "GET",
      path: "/api/admin/forms",
      expectedStatus: 401,
      expectErrorCode: "UNAUTHORIZED",
    },
    {
      name: "Admin submissions requires auth",
      method: "GET",
      path: "/api/admin/submissions",
      expectedStatus: 401,
      expectErrorCode: "UNAUTHORIZED",
    },
    {
      name: "Admin events rejects when notifications unavailable",
      method: "GET",
      path: "/api/admin/events",
      expectedStatus: 503,
      expectErrorCode: "NOTIFICATIONS_UNAVAILABLE",
    },
  ];

  const results = await Promise.all(tests.map((testCase) => runTest(baseUrl, testCase)));
  const failed = results.filter((result) => !result).length;

  if (failed > 0) {
    logger.error("API smoke tests failed", { failed, total: tests.length });
    process.exit(1);
  }

  logger.info("API smoke tests passed", { total: tests.length });
}

main().catch((error) => {
  logger.error("API smoke test runner crashed", error);
  process.exit(1);
});
