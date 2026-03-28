/**
 * Domain types for the ENSAM LISE scraper.
 *
 * Designed to be clean enough to pass directly to:
 *   - a REST API response
 *   - a PostgreSQL persistence layer
 *   - a background sync worker
 *   - a dashboard frontend
 *
 * Nullable optional fields use `null` (not `undefined`) so that JSON
 * serialisation is predictable and consumers can distinguish
 * "field absent from source" vs "field not yet fetched".
 */

export interface ENSAMCredentials {
  username: string;
  password: string;
}

export interface ENSAMSession {
  context: import("playwright").BrowserContext;
  page: import("playwright").Page;
  loggedInAt: Date;
}

// ─── Timetable event ──────────────────────────────────────────────────────────

/**
 * A single timetable entry as extracted from the LISE planning page.
 *
 * Time fields are always "HH:MM" strings when present.
 * Date field is "YYYY-MM-DD" when parsed from the calendar column header.
 */
export interface TimetableEvent {
  /** Full subject / module name as shown on screen. */
  course: string;

  /** Calendar column date. "YYYY-MM-DD" or null if not determinable. */
  date: string | null;

  /** Start time "HH:MM". */
  start: string;

  /** End time "HH:MM". */
  end: string;

  /** Room / location string as shown. null if absent. */
  room: string | null;

  /** Teacher name(s). null if not visible. */
  teacher: string | null;

  /** Event status label (e.g. "Annulé", "Déplacé"). null if absent. */
  status: string | null;

  /** Teaching type (e.g. "CM", "TD", "TP"). null if absent. */
  teachingType: string | null;
}

// ─── Week timetable ───────────────────────────────────────────────────────────

export interface WeekTimetable {
  /** Human-readable week range label from LISE UI ("12 mai – 16 mai 2025"). */
  weekLabel: string;

  /** ISO week number derived from week label when available. */
  isoWeek: string | null;

  events: TimetableEvent[];

  /** Timestamp of extraction (for cache invalidation in sync workers). */
  extractedAt: Date;
}

// ─── Top-level result ─────────────────────────────────────────────────────────

export interface SyncResult {
  success: boolean;
  weeks: WeekTimetable[];
  /** Human-readable error message. Present only when success === false. */
  error?: string;
  /** Machine error code from ENSAMError. Present only when success === false. */
  errorCode?: string;
}

// ─── Navigation direction ────────────────────────────────────────────────────

export type WeekDirection = "current" | "next" | "previous";
