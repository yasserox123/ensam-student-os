/**
 * Integration layer — import from `…/integration` or top-level `index` re-exports.
 */

export type {
  TimetableSource,
  TimetableSlotRecord,
  NormalizedWeekPayload,
} from "./normalizedTimetable";

export {
  buildDedupeKey,
  mapEventToSlotRecord,
  mapWeekToSlotRecords,
  mapWeeksToSlotRecords,
  mapWeeksToNormalizedPayloads,
} from "./timetableMapper";

export type {
  TimetableSyncOptions,
  TimetableServiceResult,
  TimetableServiceSuccess,
  TimetableServiceFailure,
} from "./timetableService";

export {
  syncTimetable,
  getCurrentWeekTimetable,
  getAdjacentWeekTimetable,
} from "./timetableService";
