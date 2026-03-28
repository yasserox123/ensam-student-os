/**
 * Student Life OS — LISE timetable integration service.
 *
 * Wraps scraper lifecycle (login → fetch → teardown) behind a small API.
 * Does not alter parsing/login/planning behaviour.
 */

import { login, closeSession, closeBrowser } from "../auth";
import { fetchTimetable, fetchAdjacentWeek } from "../planning";
import type { ENSAMCredentials, ENSAMSession, WeekTimetable } from "../types";
import { ENSAMError } from "../errors";
import { mapWeeksToSlotRecords, mapWeeksToNormalizedPayloads } from "./timetableMapper";
import type { NormalizedWeekPayload, TimetableSlotRecord } from "./normalizedTimetable";

export interface TimetableSyncOptions {
  /** Optional app user id for mapped rows. */
  userId?: string | null;
  /**
   * Total weeks to pull, starting at current (same semantics as `fetchTimetable`).
   * @default 1
   */
  weeksToFetch?: number;
  /** Include `slotRecords` / `normalizedWeeks` in the result. @default true */
  includeNormalized?: boolean;
}

export interface TimetableServiceSuccess {
  success: true;
  weeks: WeekTimetable[];
  slotRecords?: TimetableSlotRecord[];
  normalizedWeeks?: NormalizedWeekPayload[];
}

export interface TimetableServiceFailure {
  success: false;
  weeks: WeekTimetable[];
  error: string;
  errorCode?: string;
}

export type TimetableServiceResult = TimetableServiceSuccess | TimetableServiceFailure;

async function withSession<T>(
  credentials: ENSAMCredentials,
  fn: (session: ENSAMSession) => Promise<T>
): Promise<T> {
  let session: ENSAMSession | null = null;
  try {
    session = await login(credentials);
    return await fn(session);
  } finally {
    if (session) await closeSession(session);
    await closeBrowser();
  }
}

function normalizeOptions(options: TimetableSyncOptions | undefined): {
  userId: string | null;
  weeksToFetch: number;
  includeNormalized: boolean;
} {
  return {
    userId: options?.userId != null ? String(options.userId) : null,
    weeksToFetch:
      options?.weeksToFetch !== undefined
        ? Math.min(Math.max(1, Math.floor(options.weeksToFetch)), 8)
        : 1,
    includeNormalized: options?.includeNormalized !== false,
  };
}

function attachNormalized(
  weeks: WeekTimetable[],
  userId: string | null,
  include: boolean
): Pick<TimetableServiceSuccess, "slotRecords" | "normalizedWeeks"> {
  if (!include) return {};
  return {
    slotRecords: mapWeeksToSlotRecords(weeks, userId),
    normalizedWeeks: mapWeeksToNormalizedPayloads(weeks, userId),
  };
}

/**
 * Login, fetch N week(s) from the visible planning grid, close browser.
 */
export async function syncTimetable(
  credentials: ENSAMCredentials,
  options: TimetableSyncOptions = {}
): Promise<TimetableServiceResult> {
  const { userId, weeksToFetch, includeNormalized } = normalizeOptions(options);
  try {
    const weeks = await withSession(credentials, (s) =>
      fetchTimetable(s, weeksToFetch)
    );
    return {
      success: true,
      weeks,
      ...attachNormalized(weeks, userId, includeNormalized),
    };
  } catch (err) {
    const e = err as Error;
    return {
      success: false,
      weeks: [],
      error: e.message,
      errorCode: err instanceof ENSAMError ? err.code : undefined,
    };
  }
}

/**
 * Current week only (equivalent to `syncTimetable` with `weeksToFetch: 1`).
 */
export async function getCurrentWeekTimetable(
  credentials: ENSAMCredentials,
  options: Omit<TimetableSyncOptions, "weeksToFetch"> = {}
): Promise<TimetableServiceResult> {
  return syncTimetable(credentials, { ...options, weeksToFetch: 1 });
}

/**
 * Assumes LISE is showing some week; loads planning at the current week first,
 * then navigates one step in `direction` and extracts that week.
 */
export async function getAdjacentWeekTimetable(
  credentials: ENSAMCredentials,
  direction: "next" | "previous",
  options: Omit<TimetableSyncOptions, "weeksToFetch"> = {}
): Promise<TimetableServiceResult> {
  const { userId, includeNormalized } = normalizeOptions(options);
  try {
    const weeks = await withSession(credentials, async (s) => {
      await fetchTimetable(s, 1);
      const week = await fetchAdjacentWeek(s, direction);
      return [week];
    });
    return {
      success: true,
      weeks,
      ...attachNormalized(weeks, userId, includeNormalized),
    };
  } catch (err) {
    const e = err as Error;
    return {
      success: false,
      weeks: [],
      error: e.message,
      errorCode: err instanceof ENSAMError ? err.code : undefined,
    };
  }
}
