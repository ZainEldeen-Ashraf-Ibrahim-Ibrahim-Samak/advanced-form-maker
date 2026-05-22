type LogLevel = "info" | "warn" | "error" | "debug";

type LogContext = Record<string, unknown> | unknown;

interface LogPayload {
  message: string;
  context?: LogContext;
  timestamp: string;
}

const LOG_METHODS: Record<LogLevel, "info" | "warn" | "error" | "debug"> = {
  info: "info",
  warn: "warn",
  error: "error",
  debug: "debug",
};

const LOG_LEVEL_ORDER: LogLevel[] = ["debug", "info", "warn", "error"];
const CLIENT_LOG_LEVEL_KEY = "SCCT_LOG_LEVEL";

function normalizeLogLevel(level: string | null | undefined): LogLevel | null {
  if (!level) return null;

  const normalized = level.toLowerCase();
  if (
    normalized === "debug" ||
    normalized === "info" ||
    normalized === "warn" ||
    normalized === "error"
  ) {
    return normalized;
  }

  return null;
}

function resolveClientRuntimeLogLevel(): LogLevel | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const fromStorage = normalizeLogLevel(
      window.localStorage.getItem(CLIENT_LOG_LEVEL_KEY),
    );
    if (fromStorage) {
      return fromStorage;
    }
  } catch {
    // Ignore localStorage access issues (privacy mode/sandbox).
  }

  const fromGlobal = normalizeLogLevel(
    (window as Window & { __SCCT_LOG_LEVEL?: string }).__SCCT_LOG_LEVEL,
  );

  return fromGlobal;
}

function resolveMinLogLevel(): LogLevel {
  const runtimeClientLevel = resolveClientRuntimeLogLevel();
  if (runtimeClientLevel) {
    return runtimeClientLevel;
  }

  const configuredLevel = normalizeLogLevel(
    process.env.NEXT_PUBLIC_LOG_LEVEL || process.env.LOG_LEVEL || "",
  );

  if (configuredLevel) {
    return configuredLevel;
  }

  // In production we keep info/warn/error visible for operational diagnostics.
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return (
    LOG_LEVEL_ORDER.indexOf(level) >=
    LOG_LEVEL_ORDER.indexOf(resolveMinLogLevel())
  );
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) {
    return;
  }

  const payload: LogPayload = {
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  const method = LOG_METHODS[level];
  const prefix = `[dev-logger:${level}]`;

  if (context === undefined) {
    console[method](prefix, payload.message);
    return;
  }

  console[method](prefix, payload.message, {
    context: payload.context,
    timestamp: payload.timestamp,
  });
}

export const logger = {
  info(message: string, context?: LogContext): void {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext): void {
    write("warn", message, context);
  },
  error(message: string, context?: LogContext): void {
    write("error", message, context);
  },
  debug(message: string, context?: LogContext): void {
    write("debug", message, context);
  },
};
