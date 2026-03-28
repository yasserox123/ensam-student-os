/**
 * Public API surface for the ENSAM LISE scraper.
 *
 * Import from this file — never from internal modules directly.
 * This boundary allows internal refactoring without breaking consumers.
 *
 * Intended consumers:
 *   - REST API routes  (import { login, fetchTimetable } from "@ensam/scraper")
 *   - Background sync workers
 *   - CLI test scripts
 *   - Future PostgreSQL persistence layer
 */

// ── Session / browser lifecycle ──────────────────────────────────────────────
export {
  login,
  refreshSession,
  closeSession,
  closeBrowser,
  getBrowser,
  isSessionValid,
  assertSessionValid,
} from "./auth";

// ── Timetable fetching ───────────────────────────────────────────────────────
export {
  fetchTimetable,
  fetchAdjacentWeek,
  fetchCurrentWeek,
  navigateWeek,
} from "./planning";

// ── Domain types ─────────────────────────────────────────────────────────────
export type {
  ENSAMCredentials,
  ENSAMSession,
  TimetableEvent,
  WeekTimetable,
  SyncResult,
  WeekDirection,
} from "./types";

// ── Error classes ─────────────────────────────────────────────────────────────
export {
  ENSAMError,
  LoginError,
  SessionExpiredError,
  PlanningLoadError,
  WeekNavigationError,
  EventParsingError,
} from "./errors";

// ── Student Life OS integration (service + DB-ready mapping) ─────────────────
export {
  syncTimetable,
  getCurrentWeekTimetable,
  getAdjacentWeekTimetable,
  buildDedupeKey,
  mapEventToSlotRecord,
  mapWeekToSlotRecords,
  mapWeeksToSlotRecords,
  mapWeeksToNormalizedPayloads,
} from "./integration";

export type {
  TimetableSource,
  TimetableSlotRecord,
  NormalizedWeekPayload,
  TimetableSyncOptions,
  TimetableServiceResult,
  TimetableServiceSuccess,
  TimetableServiceFailure,
} from "./integration";
