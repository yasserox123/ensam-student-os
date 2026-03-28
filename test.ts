/**
 * ENSAM LISE — Timetable extraction end-to-end test script.
 *
 * ─── Usage ────────────────────────────────────────────────────────────────────
 *
 *  Normal mode (headless browser):
 *    $Env:ENSAM_USERNAME="yourlogin"; $Env:ENSAM_PASSWORD="yourpassword"; npx ts-node test.ts
 *
 *  Debug mode (headed browser + verbose logs + screenshot on error):
 *    $Env:ENSAM_DEBUG="1"; $Env:ENSAM_USERNAME="yourlogin"; $Env:ENSAM_PASSWORD="yourpassword"; npx ts-node test.ts
 *
 *  JSON structured logs (for log aggregators):
 *    $Env:ENSAM_LOG_JSON="1"; ... npx ts-node test.ts
 *
 *  With database persistence (optional):
 *    $Env:DATABASE_URL="postgresql://..."; $Env:ENSAM_DB_USER_ID="ensam_user_test"; ...
 *    (ENSAM_DB_USER_ID defaults to "ensam_user_test" if unset)
 *
 * ─── What this script does ────────────────────────────────────────────────────
 *
 *   1. Read credentials from environment
 *   2. Login to LISE
 *   3. Fetch current week timetable
 *   4. Navigate forward and fetch next week
 *   5. Persist events to PostgreSQL when DATABASE_URL is set (Prisma upsert)
 *   6. Print a human-readable summary + raw JSON output
 *   7. Exit cleanly (session + browser + Prisma closed in finally)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  login,
  fetchTimetable,
  closeSession,
  closeBrowser,
  ENSAMSession,
  SyncResult,
  ENSAMError,
} from "./index";

import { logger } from "./logger";
import { saveDebugScreenshot, saveDebugHtml } from "./utils";
import { prisma } from "./db/prisma";
import { upsertTimetableSlots } from "./db/timetableRepository";

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const username = process.env.ENSAM_USERNAME?.trim();
  const password = process.env.ENSAM_PASSWORD?.trim();
  const isDebug  = process.env.ENSAM_DEBUG === "1";

  if (!username || !password) {
    logger.error("test", "ENSAM_USERNAME and ENSAM_PASSWORD must be set");
    process.exit(1);
  }

  let session: ENSAMSession | null = null;

  try {
    // ── Step 1: Login ─────────────────────────────────────────────────────
    logger.info("test", "step 1/3 — logging in to ENSAM LISE");
    session = await login({ username, password });
    logger.info("test", "login successful ✓");

    // ── Step 2: Fetch timetable ────────────────────────────────────────────
    const weeksToFetch = (() => {
      const n = Number(process.env.ENSAM_WEEKS);
      return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 8) : 2;
    })();
    logger.info("test", `step 2/3 — fetching timetable (${weeksToFetch} week(s))`);
    const weeks = await fetchTimetable(session, weeksToFetch);
    logger.info("test", `fetched ${weeks.length} week(s) ✓`);

    const allEvents = weeks.flatMap((w) => w.events);
    const scrapedCount = allEvents.length;
    logger.info("test", `scraped ${scrapedCount} event row(s) (all weeks combined)`);

    // ── Persist to DB (upsert — no duplicate rows for same user/course/date/start) ──
    if (process.env.DATABASE_URL?.trim()) {
      const userId =
        process.env.ENSAM_DB_USER_ID?.trim() || "ensam_user_test";
      try {
        const { upserted, skipped } = await upsertTimetableSlots(
          userId,
          allEvents
        );
        logger.info(
          "test",
          `database: upserted ${upserted} row(s) (insert or update on duplicate key); ${skipped} event(s) skipped (no date)`
        );
      } catch (dbErr) {
        logger.error(
          "test",
          `database: persistence failed — ${(dbErr as Error).message}`
        );
      } finally {
        await prisma.$disconnect().catch(() => {});
      }
    } else {
      logger.info(
        "test",
        "database: skipped — set DATABASE_URL to persist timetable slots"
      );
    }

    // ── Step 3: Print results ─────────────────────────────────────────────
    logger.info("test", "step 3/3 — results\n");
    printSummary(weeks);

    // ── Final: emit full JSON (for downstream processing) ─────────────────
    const result: SyncResult = { success: true, weeks };
    process.stdout.write("\n── JSON OUTPUT ──\n");
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");

  } catch (err) {
    const error = err as Error;
    logger.error("test", `fatal error: ${error.message}`);

    if (err instanceof ENSAMError) {
      logger.error("test", `error code: ${err.code}`);
    }

    // Debug mode: save artefacts for post-mortem inspection
    if (isDebug && session) {
      await saveDebugScreenshot(session.page, "test_failure");
      await saveDebugHtml(session.page, "test_failure");
      logger.info("test", "debug artefacts saved to ./debug/");
    }

    // Emit a machine-readable failure result
    const result: SyncResult = {
      success: false,
      weeks:   [],
      error:   error.message,
      errorCode: err instanceof ENSAMError ? err.code : undefined,
    };
    process.stdout.write("\n── JSON OUTPUT ──\n");
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");

    process.exitCode = 1;
  } finally {
    if (session) await closeSession(session);
    await closeBrowser();
    await prisma.$disconnect().catch(() => {});
    logger.info("test", "browser closed — done");
  }
}

// ─── Pretty-print helper ──────────────────────────────────────────────────────

function printSummary(
  weeks: Awaited<ReturnType<typeof fetchTimetable>>
): void {
  for (const week of weeks) {
    const header = `── ${week.weekLabel}${week.isoWeek ? ` (${week.isoWeek})` : ""} — ${week.events.length} event(s) ──`;
    console.log(header);

    if (week.events.length === 0) {
      console.log("  (no events this week)\n");
      continue;
    }

    for (const ev of week.events) {
      console.log(`  • ${ev.course}`);
      console.log(`    Time : ${ev.start || "?"} – ${ev.end || "?"}`);
      if (ev.date)         console.log(`    Date : ${ev.date}`);
      if (ev.room)         console.log(`    Room : ${ev.room}`);
      if (ev.teacher)      console.log(`    Prof : ${ev.teacher}`);
      if (ev.teachingType) console.log(`    Type : ${ev.teachingType}`);
      if (ev.status)       console.log(`    Status: ${ev.status}`);
    }
    console.log();
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

main();
