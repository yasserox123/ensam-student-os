import type { Prisma } from "@prisma/client";
import type { TimetableEvent } from "../types";

/**
 * Parse YYYY-MM-DD from the scraper without local timezone shifting the calendar day.
 */
function scraperDateToUtcNoon(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) {
    throw new Error(`Invalid date string: ${isoDate}`);
  }
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/**
 * Convert one scraper event + user to Prisma create/upsert payload.
 * Returns null when `date` is missing (cannot satisfy DB + unique constraint).
 */
export function mapScraperEventToSlot(
  event: TimetableEvent,
  userId: string
): Omit<Prisma.TimetableSlotUncheckedCreateInput, "id"> | null {
  if (!event.date?.trim()) {
    return null;
  }

  return {
    userId,
    source: "LISE",
    course: event.course,
    date: scraperDateToUtcNoon(event.date.trim()),
    start: event.start,
    end: event.end,
    room: event.room ?? "",
    teacher: event.teacher,
    status: event.status,
    teachingType: event.teachingType,
    extractedAt: new Date(),
  };
}
