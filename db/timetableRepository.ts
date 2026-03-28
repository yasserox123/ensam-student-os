import type { TimetableEvent } from "../types";
import { prisma } from "./prisma";
import { mapScraperEventToSlot } from "./mapScraperEventToSlot";

/**
 * Get timetable slots for a user within a date range.
 */
export async function getTimetableSlots(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: any = { userId };
  
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = startDate;
    if (endDate) where.date.lte = endDate;
  }

  return prisma.timetableSlot.findMany({
    where,
    orderBy: [{ date: "asc" }, { start: "asc" }],
  });
}

/**
 * Insert or update slots for a user. Rows are keyed by (userId, course, date, start).
 * Events without a parseable `date` are skipped.
 */
export async function upsertTimetableSlots(
  userId: string,
  events: TimetableEvent[]
): Promise<{ upserted: number; skipped: number }> {
  let upserted = 0;
  let skipped = 0;

  for (const event of events) {
    const data = mapScraperEventToSlot(event, userId);
    if (!data) {
      skipped += 1;
      continue;
    }

    await prisma.timetableSlot.upsert({
      where: {
        userId_course_date_start: {
          userId: data.userId,
          course: data.course,
          date: data.date,
          start: data.start,
        },
      },
      create: data,
      update: {
        end: data.end,
        room: data.room,
        teacher: data.teacher,
        status: data.status,
        teachingType: data.teachingType,
        source: data.source,
        extractedAt: data.extractedAt,
      },
    });
    upserted += 1;
  }

  return { upserted, skipped };
}
