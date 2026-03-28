/**
 * Lightweight structured logger for the ENSAM scraper.
 *
 * Usage:
 *   import { logger } from "./logger";
 *   logger.info ("auth", "opening login page");
 *   logger.debug("auth", "page url", { url });
 *   logger.warn ("parser", "field missing", { field: "room" });
 *   logger.error("planning", "calendar not rendered", err);
 *
 * Controlled by environment variables:
 *   ENSAM_DEBUG=1   — enables debug output + verbose prefixes
 *   ENSAM_LOG_JSON=1 — write JSON lines (for structured log aggregators)
 */

const isDebug = process.env.ENSAM_DEBUG === "1";
const isJson  = process.env.ENSAM_LOG_JSON === "1";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_EMOJI: Record<LogLevel, string> = {
  debug: "🔍",
  info:  "ℹ️ ",
  warn:  "⚠️ ",
  error: "❌",
};

function emit(
  level: LogLevel,
  namespace: string,
  message: string,
  meta?: unknown
): void {
  if (level === "debug" && !isDebug) return;

  const ts = new Date().toISOString();
  const tag = `[${namespace}]`;

  if (isJson) {
    const entry: Record<string, unknown> = { ts, level, namespace, message };
    if (meta !== undefined) entry.meta = meta;
    process.stdout.write(JSON.stringify(entry) + "\n");
    return;
  }

  const prefix = isDebug
    ? `${LEVEL_EMOJI[level]} ${ts.slice(11, 23)} ${tag}`
    : `${LEVEL_EMOJI[level]} ${tag}`;

  const line = `${prefix} ${message}`;

  if (level === "error") {
    console.error(line, meta !== undefined ? meta : "");
  } else if (level === "warn") {
    console.warn(line, meta !== undefined ? meta : "");
  } else {
    console.log(line, meta !== undefined ? meta : "");
  }
}

export const logger = {
  debug: (ns: string, msg: string, meta?: unknown) => emit("debug", ns, msg, meta),
  info:  (ns: string, msg: string, meta?: unknown) => emit("info",  ns, msg, meta),
  warn:  (ns: string, msg: string, meta?: unknown) => emit("warn",  ns, msg, meta),
  error: (ns: string, msg: string, meta?: unknown) => emit("error", ns, msg, meta),
};
