/**
 * Custom error hierarchy for the ENSAM LISE scraper.
 *
 * Every error class carries structured context so that upstream callers
 * (API routes, sync workers, dashboards) can react specifically instead
 * of comparing raw message strings.
 */

export class ENSAMError extends Error {
  /** Machine-readable code consumed by upstream handlers. */
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ENSAMError";
    this.code = code;
    // Maintain proper stack trace in V8 (captureStackTrace is non-standard)
    if (typeof (Error as { captureStackTrace?: unknown }).captureStackTrace === "function") {
      (Error as unknown as { captureStackTrace: (t: object, c: unknown) => void })
        .captureStackTrace(this, this.constructor);
    }
  }
}

// ─── Authentication ──────────────────────────────────────────────────────────

export class LoginError extends ENSAMError {
  constructor(reason: string) {
    super("LOGIN_FAILED", `[auth] Login failed — ${reason}`);
    this.name = "LoginError";
  }
}

export class SessionExpiredError extends ENSAMError {
  constructor() {
    super("SESSION_EXPIRED", "[auth] Session has expired — re-login required");
    this.name = "SessionExpiredError";
  }
}

// ─── Planning page ───────────────────────────────────────────────────────────

export class PlanningLoadError extends ENSAMError {
  constructor(detail: string) {
    super("PLANNING_LOAD_FAILED", `[planning] Failed to load planning page — ${detail}`);
    this.name = "PlanningLoadError";
  }
}

export class WeekNavigationError extends ENSAMError {
  constructor(direction: "next" | "previous", detail: string) {
    super(
      "WEEK_NAV_FAILED",
      `[planning] Cannot navigate ${direction} week — ${detail}`
    );
    this.name = "WeekNavigationError";
  }
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

export class EventParsingError extends ENSAMError {
  readonly eventIndex: number;

  constructor(eventIndex: number, detail: string) {
    super(
      "EVENT_PARSE_FAILED",
      `[parser] Event #${eventIndex} could not be parsed — ${detail}`
    );
    this.name = "EventParsingError";
    this.eventIndex = eventIndex;
  }
}
