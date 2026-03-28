/**
 * Planning page orchestrator.
 *
 * Responsibilities:
 *   - Navigate to the LISE planning page
 *   - Extract the timetable for one or more weeks
 *   - Handle week navigation (next / previous)
 *   - Produce clean WeekTimetable objects ready for persistence or API response
 *
 * This module does NOT own the browser or session lifecycle — that belongs
 * to auth.ts.  It receives an authenticated session and operates within it.
 */

import { Page } from "playwright";
import { ENSAMSession, WeekTimetable } from "./types";
import { URLS, PLANNING_SELECTORS, TIMEOUTS, isLoginSurfaceHref } from "./selectors";
import { PlanningLoadError, WeekNavigationError, SessionExpiredError } from "./errors";
import { logger } from "./logger";
import { resolveFirstVisible, waitForAjaxIdle, saveDebugScreenshot, saveDebugHtml } from "./utils";
import { assertSessionValid } from "./auth";
import { extractCurrentWeek } from "./parser";

const isDebug = process.env.ENSAM_DEBUG === "1";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch timetable data for the current week and optionally N additional weeks.
 *
 * @param session       — valid, logged-in session
 * @param weeksToFetch  — total number of weeks to return (1 = current week only)
 */
export async function fetchTimetable(
  session: ENSAMSession,
  weeksToFetch = 1
): Promise<WeekTimetable[]> {
  const { page } = session;

  // Guard: fail fast with a typed error if session has expired
  assertSessionValid(page);

  await navigateToPlanning(page);

  const results: WeekTimetable[] = [];

  // ── Current week ──────────────────────────────────────────────────────────
  logger.info("planning", "extracting current week");
  results.push(await extractWeek(page));

  // ── Subsequent weeks (navigate forward) ───────────────────────────────────
  for (let i = 1; i < weeksToFetch; i++) {
    logger.info("planning", `navigating to week +${i}`);
    await navigateWeek(page, "next");
    results.push(await extractWeek(page));
  }

  return results;
}

/**
 * Navigate to next or previous week and return the extracted timetable.
 * Exported so test scripts can drive navigation manually.
 */
export async function fetchAdjacentWeek(
  session: ENSAMSession,
  direction: "next" | "previous"
): Promise<WeekTimetable> {
  assertSessionValid(session.page);
  await navigateWeek(session.page, direction);
  return extractWeek(session.page);
}

/**
 * Navigate back to the current week using the "Today" button, then extract.
 */
export async function fetchCurrentWeek(session: ENSAMSession): Promise<WeekTimetable> {
  assertSessionValid(session.page);
  await resetToToday(session.page);
  return extractWeek(session.page);
}

// ─── Navigation ───────────────────────────────────────────────────────────────

/**
 * Navigate to Planning.xhtml if not already there.
 * Throws `PlanningLoadError` if the calendar grid does not render.
 */
async function navigateToPlanning(page: Page): Promise<void> {
  if (!page.url().includes("Planning.xhtml")) {
    logger.info("planning", "navigating to planning page");
    await page.goto(URLS.planning, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUTS.navigation,
    });
  } else {
    logger.debug("planning", "already on planning page");
  }

  const calCombined = PLANNING_SELECTORS.calendarContainer.join(", ");
  const calendarAlreadyThere = await page
    .locator(calCombined)
    .first()
    .isVisible({ timeout: 4_000 })
    .catch(() => false);

  if (!calendarAlreadyThere) {
    logger.info(
      "planning",
      "calendar not in DOM yet — opening « Mon planning étudiant » from sidebar (LISE empty shell)"
    );
    await openStudentPlanningFromMenu(page);
  }

  await waitForCalendarRendered(page);
}

/**
 * Bare Planning.xhtml often has `page-inconnue` / empty `form:Center` until a rubrique is loaded.
 * The student grid is triggered from the Scolarité → « Mon planning étudiant » menu entry.
 */
async function openStudentPlanningFromMenu(page: Page): Promise<void> {
  const link = page.locator(PLANNING_SELECTORS.menuStudentPlanning.join(", ")).first();

  if (!(await link.isVisible({ timeout: 2_500 }).catch(() => false))) {
    const scol = await resolveFirstVisible(
      page,
      PLANNING_SELECTORS.menuScolarite,
      TIMEOUTS.elementProbe
    );
    if (scol) {
      await scol.click();
      await page.waitForTimeout(450);
    }
  }

  await link.waitFor({ state: "visible", timeout: TIMEOUTS.elementProbe });
  await link.click();

  await waitForAjaxIdle(page, PLANNING_SELECTORS.ajaxLoadingIndicator.join(", "), {
    appearTimeout: 2_000,
    hideTimeout: TIMEOUTS.ajaxUpdate,
    settle: 600,
  });
}

/**
 * Click the next/previous week button and wait for the calendar to update.
 * Throws `WeekNavigationError` if the button is not found.
 */
export async function navigateWeek(
  page: Page,
  direction: "next" | "previous"
): Promise<void> {
  const selectorList =
    direction === "next"
      ? PLANNING_SELECTORS.nextWeekButton
      : PLANNING_SELECTORS.prevWeekButton;

  logger.debug("planning", `looking for ${direction} week button`);

  const btn = await resolveFirstVisible(page, selectorList, TIMEOUTS.elementProbe);
  if (!btn) {
    if (isDebug) {
      await saveDebugScreenshot(page, `nav_${direction}_not_found`);
      await saveDebugHtml(page, `nav_${direction}_not_found`);
    }
    throw new WeekNavigationError(
      direction,
      `button not found — tried: ${selectorList.join(", ")}`
    );
  }

  logger.debug("planning", `clicking ${direction} week button`);
  await btn.click();

  // Wait for JSF ajax cycle triggered by navigation
  await waitForAjaxIdle(
    page,
    PLANNING_SELECTORS.ajaxLoadingIndicator.join(", "),
    { appearTimeout: 1_200, hideTimeout: TIMEOUTS.ajaxUpdate, settle: 400 }
  );

  // Wait for at least one event to appear (or settle on empty week)
  await waitForCalendarSettled(page);

  logger.debug("planning", `${direction} week navigation complete`);
}

/**
 * Click the "Today" button to return to the current week.
 */
async function resetToToday(page: Page): Promise<void> {
  logger.info("planning", "resetting to current week (today)");
  const btn = await resolveFirstVisible(
    page,
    PLANNING_SELECTORS.todayButton,
    TIMEOUTS.elementProbe
  );
  if (!btn) {
    logger.warn("planning", "Today button not found — attempting full page reload");
    await page.goto(URLS.planning, { waitUntil: "domcontentloaded", timeout: TIMEOUTS.navigation });
  } else {
    await btn.click();
    await waitForAjaxIdle(
      page,
      PLANNING_SELECTORS.ajaxLoadingIndicator.join(", ")
    );
  }
  await waitForCalendarSettled(page);
}

// ─── Extraction ───────────────────────────────────────────────────────────────

/**
 * Extract events for the currently visible week and wrap in a WeekTimetable.
 */
async function extractWeek(page: Page): Promise<WeekTimetable> {
  const weekLabel = await readWeekLabel(page);
  logger.info("planning", `reading week: "${weekLabel}"`);

  const events = await extractCurrentWeek(page);
  logger.info("planning", `week "${weekLabel}": ${events.length} event(s) extracted`);

  return {
    weekLabel,
    isoWeek: deriveIsoWeek(weekLabel),
    events,
    extractedAt: new Date(),
  };
}

// ─── Week label ───────────────────────────────────────────────────────────────

/**
 * Read the week range label from the calendar toolbar.
 * Falls back to a computed label if the element is not found.
 */
async function readWeekLabel(page: Page): Promise<string> {
  const el = await resolveFirstVisible(
    page,
    PLANNING_SELECTORS.weekLabel,
    3_000
  );
  if (el) {
    try {
      return (await el.innerText()).replace(/\s+/g, " ").trim();
    } catch {
      // element disappeared between isVisible and innerText — fall through
    }
  }
  logger.warn("planning", "week label element not found — computing from current date");
  return computeWeekLabel(new Date());
}

/**
 * Build a "DD mois – DD mois YYYY" label from a date.
 */
function computeWeekLabel(date: Date): string {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7)); // ISO Monday
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return `${fmt(monday)} – ${fmt(friday)}`;
}

/**
 * Try to derive an ISO week string ("2025-W20") from the week label.
 * Returns null if the label cannot be parsed.
 */
function deriveIsoWeek(label: string): string | null {
  // Try to find a year in the label
  const yearMatch = label.match(/(\d{4})/);
  if (!yearMatch) return null;

  // Rough heuristic: find first day number in label
  const dayMatch = label.match(/(\d{1,2})/);
  if (!dayMatch) return null;

  // Reconstruct a date from fragments — imprecise but useful for display
  const MONTHS: Record<string, number> = {
    janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
    juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12,
  };

  const monthMatch = label.toLowerCase().match(
    /(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/
  );
  if (!monthMatch) return null;

  const year  = parseInt(yearMatch[1], 10);
  const month = MONTHS[monthMatch[1]] ?? null;
  const day   = parseInt(dayMatch[1], 10);
  if (!month) return null;

  const d   = new Date(year, month - 1, day);
  const thu = new Date(d);
  thu.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7)); // ISO Thursday
  const week = Math.ceil(
    ((thu.getTime() - new Date(thu.getFullYear(), 0, 1).getTime()) / 86_400_000 + 1) / 7
  );

  return `${thu.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ─── Calendar readiness helpers ───────────────────────────────────────────────

/**
 * WebAurion sets `code_type_rubrique_MON_PLANNING_APPRENANT` on `<body>` when the student
 * planning rubrique is active — aligns with DevTools, distinct from empty planning shell.
 */
async function waitForStudentPlanningBody(page: Page): Promise<void> {
  const sel = PLANNING_SELECTORS.studentPlanningBody.join(", ");
  const ok = await page
    .waitForSelector(sel, { state: "attached", timeout: 20_000 })
    .then(() => true)
    .catch(() => false);

  if (!ok) {
    const cls = (await page.locator("body").getAttribute("class").catch(() => null)) ?? "";
    logger.warn("planning", "student planning body marker not seen within 20s", { bodyClass: cls });
  } else {
    logger.debug("planning", "body rubrique MON_PLANNING_APPRENANT present");
  }
}

/**
 * Wait for the calendar container to be visible.
 * Throws `PlanningLoadError` on timeout.
 */
async function waitForCalendarRendered(page: Page): Promise<void> {
  await waitForStudentPlanningBody(page);

  const combinedSel = PLANNING_SELECTORS.calendarContainer.join(", ");

  logger.debug("planning", "waiting for calendar container");

  const found = await page
    .waitForSelector(combinedSel, {
      state: "visible",
      timeout: TIMEOUTS.calendarRender,
    })
    .then(() => true)
    .catch(() => false);

  if (!found) {
    if (isDebug) {
      await saveDebugScreenshot(page, "planning_load_failure");
      await saveDebugHtml(page, "planning_load_failure");
    }

    // If we were redirected back to login, surface the right error
    if (isLoginSurfaceHref(page.url())) {
      throw new SessionExpiredError();
    }

    throw new PlanningLoadError(
      `calendar container not found after ${TIMEOUTS.calendarRender}ms — ` +
      `tried: ${combinedSel} — current URL: ${page.url()}`
    );
  }

  logger.debug("planning", "calendar container visible");
  await waitForAjaxIdle(page, PLANNING_SELECTORS.ajaxLoadingIndicator.join(", "));
}

/**
 * After navigation, wait for either events to appear or a short timeout.
 * An empty week is valid — we do not throw on no events.
 */
async function waitForCalendarSettled(page: Page): Promise<void> {
  const eventSel = PLANNING_SELECTORS.eventBlock.join(", ");

  await page
    .waitForSelector(eventSel, { state: "visible", timeout: TIMEOUTS.calendarRender })
    .catch(() => {
      logger.warn("planning", "no events visible after navigation — week may be empty");
    });

  // Extra settle time for DOM mutations (FullCalendar re-render can be async)
  await page.waitForTimeout(350);
}
