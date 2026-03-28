/**
 * Maps scraper domain types → persistence-ready `TimetableSlotRecord`s.
 */

import type { TimetableEvent, WeekTimetable } from "../types";
import type { NormalizedWeekPayload, TimetableSlotRecord } from "./normalizedTimetable";

const SOURCE: TimetableSlotRecord["source"] = "LISE";

function hashDedupe(parts: string[]): string {
  const s = parts.join("|");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return `lise_${(h >>> 0).toString(16)}`;
}

/**
 * Build a deterministic key for UPSERT (per user once userId is set).
 */
export function buildDedupeKey(
  userId: string | null,
  weekLabel: string,
  ev: Pick<
    TimetableEvent,
    "course" | "date" | "start" | "end" | "room" | "teachingType"
  >
): string {
  return hashDedupe([
    userId ?? "",
    SOURCE,
    weekLabel,
    ev.course,
    ev.date ?? "",
    ev.start,
    ev.end,
    ev.room ?? "",
    ev.teachingType ?? "",
  ]);
}

export function mapEventToSlotRecord(
  week: WeekTimetable,
  event: TimetableEvent,
  userId: string | null
): TimetableSlotRecord {
  const extractedAt = week.extractedAt.toISOString();
  return {
    userId,
    source: SOURCE,
    course: event.course,
    date: event.date,
    start: event.start,
    end: event.end,
    room: event.room,
    teacher: event.teacher,
    status: event.status,
    teachingType: event.teachingType,
    extractedAt,
    weekLabel: week.weekLabel,
    isoWeek: week.isoWeek,
    dedupeKey: buildDedupeKey(userId, week.weekLabel, event),
  };
}

/** All events in one scraped week → flat slot rows. */
export function mapWeekToSlotRecords(
  week: WeekTimetable,
  userId: string | null = null
): TimetableSlotRecord[] {
  return week.events.map((e) => mapEventToSlotRecord(week, e, userId));
}

/** Several weeks (e.g. sync result) → single array for bulk insert. */
export function mapWeeksToSlotRecords(
  weeks: WeekTimetable[],
  userId: string | null = null
): TimetableSlotRecord[] {
  return weeks.flatMap((w) => mapWeekToSlotRecords(w, userId));
}

/** Grouped by week for APIs that prefer nested payloads. */
export function mapWeeksToNormalizedPayloads(
  weeks: WeekTimetable[],
  userId: string | null = null
): NormalizedWeekPayload[] {
  return weeks.map((w) => ({
    weekLabel: w.weekLabel,
    isoWeek: w.isoWeek,
    extractedAt: w.extractedAt.toISOString(),
    slots: mapWeekToSlotRecords(w, userId),
  }));
}
