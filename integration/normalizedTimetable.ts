/**
 * Normalized timetable model for Student Life OS persistence.
 *
 * Scraper output (`TimetableEvent` / `WeekTimetable`) is mapped into these
 * shapes before INSERT/UPSERT into a database.
 */

/** Only LISE is supported today; extend union when new connectors exist. */
export type TimetableSource = "LISE";

/**
 * One calendar slot, DB-ready (flat, explicit nulls, ISO timestamps as strings).
 */
export interface TimetableSlotRecord {
  /** Linked app user; null until auth is wired in the API. */
  userId: string | null;

  /** Upstream system identifier. */
  source: TimetableSource;

  course: string;
  /** YYYY-MM-DD or null if unknown. */
  date: string | null;
  /** HH:MM */
  start: string;
  /** HH:MM */
  end: string;
  room: string | null;
  teacher: string | null;
  status: string | null;
  teachingType: string | null;

  /** When this row was produced by the scraper (ISO 8601). */
  extractedAt: string;

  /** LISE week banner text (e.g. "23 — 29 Mars 2026"). */
  weekLabel: string;
  /** Derived ISO week when available (e.g. "2026-W13"). */
  isoWeek: string | null;

  /**
   * Optional stable fingerprint for idempotent upserts (same logic can be
   * reimplemented in SQL). Not a DB primary key.
   */
  dedupeKey: string;
}

export interface NormalizedWeekPayload {
  weekLabel: string;
  isoWeek: string | null;
  extractedAt: string;
  slots: TimetableSlotRecord[];
}
