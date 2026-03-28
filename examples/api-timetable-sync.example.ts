/**
 * Example: how a backend route could call the timetable service.
 *
 * Not wired to Express/Fastify — paste and adapt when you add HTTP.
 *
 * POST /api/timetable/sync
 * Body: { "username": "…", "password": "…", "userId"?: "…", "weeks"?: 2 }
 */

import type { TimetableServiceResult } from "../integration/timetableService";
import { syncTimetable } from "../integration/timetableService";
import type { ENSAMCredentials } from "../types";

/** Replace with your request type (validated with zod, etc.). */
export interface TimetableSyncHttpBody {
  username: string;
  password: string;
  /** Optional Student Life OS user id for mapped rows. */
  userId?: string;
  /** Weeks to fetch (capped inside service). */
  weeks?: number;
}

/**
 * Handler sketch for POST /api/timetable/sync.
 * Return JSON suitable for `Response.json()` or send().
 */
export async function handlePostTimetableSync(
  body: TimetableSyncHttpBody
): Promise<{ status: number; json: TimetableServiceResult }> {
  const { username, password, userId, weeks } = body;

  if (!username?.trim() || !password) {
    return {
      status: 400,
      json: {
        success: false,
        weeks: [],
        error: "username and password are required",
      },
    };
  }

  const credentials: ENSAMCredentials = {
    username: username.trim(),
    password,
  };

  const result = await syncTimetable(credentials, {
    userId: userId ?? null,
    weeksToFetch: weeks,
    includeNormalized: true,
  });

  return {
    status: result.success ? 200 : 502,
    json: result,
  };
}
