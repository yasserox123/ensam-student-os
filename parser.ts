/**
 * Timetable event parser.
 *
 * Two-pass strategy:
 *   Pass 1 — Inline extraction: fast, no clicks, reads DOM directly via
 *             page.evaluate(). Gets course name + approximate times from
 *             element text / data attributes.
 *   Pass 2 — Modal extraction: click each event, read the overlay panel,
 *             close it. Yields the most complete data (room, teacher, etc.).
 *
 * Results from both passes are merged — modal data wins, inline data fills gaps.
 * Every field that cannot be determined returns `null` (never `undefined`).
 */

import { Page, Locator } from "playwright";
import { TimetableEvent } from "./types";
import { PLANNING_SELECTORS, MODAL_SELECTORS, TIMEOUTS } from "./selectors";
import { EventParsingError } from "./errors";
import { logger } from "./logger";
import { normalizeText, normalizeTime, parseTimeRange, waitForAjaxIdle } from "./utils";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract all timetable events from the currently visible planning week.
 *
 * @param page — the authenticated planning page
 */
export async function extractCurrentWeek(page: Page): Promise<TimetableEvent[]> {
  await waitForCalendarReady(page);

  logger.info("parser", "starting inline extraction pass");
  const inlineEvents = await extractInlineEvents(page);
  logger.info("parser", `inline pass: ${inlineEvents.length} events found`);

  logger.info("parser", "starting modal extraction pass");
  const modalEvents  = await extractViaModals(page);
  logger.info("parser", `modal pass: ${modalEvents.length} events extracted`);

  const merged = mergeEvents(inlineEvents, modalEvents);
  logger.info("parser", `merged result: ${merged.length} events`);

  if (merged.length === 0) {
    logger.warn(
      "parser",
      "no events found for the visible week — empty calendar or selectors may need updating"
    );
  }

  return merged;
}

// ─── Pass 1: inline extraction ────────────────────────────────────────────────

/**
 * Read event data directly from DOM nodes — no clicks.
 *
 * Executed inside page.evaluate() for speed; all helper functions must be
 * self-contained (no closures over Node.js scope).
 */
async function extractInlineEvents(page: Page): Promise<TimetableEvent[]> {
  // Serialise only the primitive strings we need — Locator objects cannot
  // cross the page.evaluate boundary.
  const selectors = {
    eventBlock:  PLANNING_SELECTORS.eventBlock.join(", "),
    eventTitle:  PLANNING_SELECTORS.eventTitle.join(", "),
    eventTime:   PLANNING_SELECTORS.eventTime.join(", "),
  };

  type InlineRaw = { course: string; start: string; end: string; room: string | null };

  const rawEvents = await page.evaluate<InlineRaw[], typeof selectors>(
    (sel: typeof selectors) => {
      // ── helpers (must be inlined — no imports inside evaluate) ────────────
      function cleanText(t: string): string {
        return t.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
      }

      function normalizeTimeInline(raw: string): string {
        return raw.replace(/[Hh]/, ":").replace(/^(\d):/, "0$1:").trim();
      }

      function parseTimeRangeInline(
        text: string
      ): { start: string; end: string } | null {
        const m = text.match(/(\d{1,2}[hH:]\d{2})\s*[-\u2013\u2014]\s*(\d{1,2}[hH:]\d{2})/);
        if (!m) return null;
        return { start: normalizeTimeInline(m[1]), end: normalizeTimeInline(m[2]) };
      }

      // ── extraction ────────────────────────────────────────────────────────
      const blocks = Array.from(document.querySelectorAll(sel.eventBlock));
      const results: InlineRaw[] = [];

      for (const block of blocks) {
        const computed = window.getComputedStyle(block);
        if (computed.display === "none" || computed.visibility === "hidden") continue;

        // Course name
        const titleEl = block.querySelector(sel.eventTitle);
        const course  = cleanText(titleEl?.textContent ?? block.textContent ?? "");
        if (!course) continue;

        // Time from data attributes (FullCalendar sometimes renders them)
        const el    = block as HTMLElement;
        let   start = el.dataset.start ?? el.getAttribute("data-start") ?? "";
        let   end   = el.dataset.end   ?? el.getAttribute("data-end")   ?? "";

        // Fallback: parse time element inner text
        if (!start) {
          const timeEl   = block.querySelector(sel.eventTime);
          const timeText = cleanText(timeEl?.textContent ?? block.textContent ?? "");
          const parsed   = parseTimeRangeInline(timeText);
          if (parsed) { start = parsed.start; end = parsed.end; }
        }

        // Room heuristic — common French room name patterns
        const innerText = el.innerText ?? "";
        const roomMatch = innerText.match(
          /(?:Salle|Amphi|Labo(?:ratoire)?|Lab|Atelier|B\u00e2t\.?\s*\w+|Room)\s+[\w\d/.-]+/i
        );

        results.push({
          course,
          start,
          end,
          room: roomMatch ? cleanText(roomMatch[0]) : null,
        });
      }

      return results;
    },
    selectors
  );

  // Shape into full TimetableEvent
  return rawEvents.map((r) => ({
    course:       r.course,
    date:         null,
    start:        r.start,
    end:          r.end,
    room:         r.room,
    teacher:      null,
    status:       null,
    teachingType: detectTeachingType(r.course),
  }));
}

// ─── Pass 2: modal extraction ─────────────────────────────────────────────────

/**
 * PrimeFaces keeps hidden dialog nodes in the DOM; skip those via visible filter.
 * LISE shows a "Chargement en cours" dialog during ajax — never treat it as the event detail.
 */
function activeModalLocator(page: Page): Locator {
  return page
    .locator(MODAL_SELECTORS.modalContainer.join(", "))
    .filter({ visible: true })
    .filter({
      hasNotText: /Chargement en cours|Merci de patienter|^\\s*Patientez/i,
    })
    .first();
}

async function waitForLiseAjaxBusyDialogGone(page: Page): Promise<void> {
  const busy = page
    .locator(".ui-dialog")
    .filter({ visible: true })
    .filter({ hasText: /Chargement en cours|Merci de patienter/i });
  await busy.waitFor({ state: "hidden", timeout: 25_000 }).catch(() => {});
}

/**
 * Click every visible event block, extract the detail modal, close it.
 * Errors on individual events are non-fatal — logged and skipped.
 */
async function extractViaModals(page: Page): Promise<TimetableEvent[]> {
  const events: TimetableEvent[] = [];

  const eventBlocks = page.locator(PLANNING_SELECTORS.eventBlock.join(", "));
  const count = await eventBlocks.count();
  logger.debug("parser", `found ${count} event elements in DOM`);

  for (let i = 0; i < count; i++) {
    const block = eventBlocks.nth(i);

    try {
      if (!(await block.isVisible())) continue;

      logger.debug("parser", `clicking event #${i}`);
      await block.scrollIntoViewIfNeeded().catch(() => {});
      await block.click({ timeout: 5_000 });
      await waitForLiseAjaxBusyDialogGone(page);
      await page.waitForTimeout(350);

      const modal = activeModalLocator(page);
      const modalOpened = await modal
        .waitFor({ state: "visible", timeout: TIMEOUTS.modalOpen })
        .then(() => true)
        .catch(() => false);

      if (!modalOpened) {
        logger.debug("parser", `modal did not open for event #${i} — skipping`);
        await dismissAnyOverlay(page);
        continue;
      }

      const event = await extractFromModal(page, modal, i);
      if (event) {
        events.push(event);
        logger.info(
          "parser",
          `extracted: ${event.course} | ${event.start}–${event.end} | ${event.room ?? "no room"}`
        );
      }

      await closeModal(page, modal);
    } catch (err) {
      const detail = (err as Error).message;
      logger.warn("parser", `event #${i} skipped`, new EventParsingError(i, detail));
      await dismissAnyOverlay(page);
    }

    // Throttle — give JSF time to settle between clicks
    await page.waitForTimeout(250);
  }

  return events;
}

// ─── Modal data extraction ────────────────────────────────────────────────────

/** French month → MM for Du/Au date lines (accents normalized). */
const MOIS_FR: Record<string, string> = {
  janvier: "01",
  fevrier: "02",
  mars: "03",
  avril: "04",
  mai: "05",
  juin: "06",
  juillet: "07",
  aout: "08",
  septembre: "09",
  octobre: "10",
  novembre: "11",
  decembre: "12",
};

function stripFrAccents(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * PrimeFaces often concatenates labels and values with no separator in
 * `textContent` (e.g. `Du0800Au0930`, `SalleP3`). Restore breaks so Du/Au
 * and Salle patterns can match.
 */
function scrubLiseGluedLabels(text: string): string {
  let s = text.replace(/\uFF1A/g, ":").replace(/：/g, ":");
  s = s.replace(/(\d{1,2}\s*:\s*\d{2})(Du|Au|Début|Fin)(?=[0-9:])/gi, "$1 $2 ");
  s = s.replace(/(^|[^\wÀ-ÿ])(Du|Début)(?=[0-9:])/gi, "$1$2 ");
  s = s.replace(/(^|[^\wÀ-ÿ])(Au|Fin)(?=[0-9:])/gi, "$1$2 ");
  s = s.replace(/(\d)(Du|Au|Début|Fin)(?=[0-9:])/gi, "$1 $2 ");
  s = s.replace(
    /([a-zàâäéèêëîïôùûüç])(Du|Début|Au|Fin)(?=[0-9:])/gi,
    "$1 $2 "
  );
  s = s.replace(/(^|[^\wÀ-ÿ])(Salle)(?=[A-Za-zÀ-ÿ0-9])/gi, "$1$2 ");
  return s;
}

/**
 * LISE detail modal: Matière / Du … à HH:MM / Au … à HH:MM / Salle.
 * Works on one blob or multiline; stops Matière before next known label.
 */
function parseLiseMatiereDuAuSalle(raw: string): {
  course: string;
  start: string;
  end: string;
  room: string | null;
  date: string | null;
} {
  const flat = normalizeText(raw);
  let course = "";
  const stopMatiere =
    "(?=Type\\s+d['’]enseignement|Du\\s*:|Au\\s*:|Salle\\s*:|Statut|Description|Ressources|Groupes|Code\\s*:|Libellé|Est une|Intervenant)";
  const mMatiere = flat.match(
    new RegExp(`Matière\\s*[:\\s]*(.+?)${stopMatiere}`, "i")
  );
  if (mMatiere?.[1]) course = normalizeText(mMatiere[1]);

  if (!course) {
    const loose = flat.match(
      /Matière\s*[:\s]*(.+?)(?=\s+Du\s*:|\s+Au\s*:|\s+Salle\s*:|\bType\s+d|$)/i
    );
    if (loose?.[1]) course = normalizeText(loose[1]);
  }

  if (!course) {
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      const lm = t.match(/^Matière\s*[:\s]+(.+)$/i);
      if (lm?.[1]) {
        course = normalizeText(lm[1]);
        break;
      }
    }
  }

  const pickTimeFromSegment = (segment: string): string => {
    if (!segment?.trim()) return "";
    const t = normalizeText(segment);
    const withA = t.match(
      /[àÀ]\s*(\d{1,2}\s*:\s*\d{2}|\d{1,2}\s*h\s*\d{2})/i
    );
    if (withA?.[1]) return normalizeTime(withA[1].replace(/\s/g, ""));
    const withPlainA = t.match(
      /\ba\s+(\d{1,2}\s*:\s*\d{2}|\d{1,2}\s*h\s*\d{2})/i
    );
    if (withPlainA?.[1]) return normalizeTime(withPlainA[1].replace(/\s/g, ""));
    const hours = [...t.matchAll(/\b(\d{1,2}\s*:\s*\d{2})\b/g)];
    if (hours.length > 0) {
      const last = hours[hours.length - 1][1].replace(/\s/g, "");
      return normalizeTime(last);
    }
    const hstyle = t.match(/\b(\d{1,2}\s*h\s*\d{2})\b/i);
    return hstyle?.[1] ? normalizeTime(hstyle[1].replace(/\s/g, "")) : "";
  };

  let start = "";
  let end = "";
  // LISE often concatenates "08:00" and "Au" → \bAu splits fail; use time anchors + \D*Au.
  const duAuTimes = flat.match(
    /\bDu\s*[:\s][\s\S]*?(\d{1,2}\s*:\s*\d{2}|\d{1,2}\s*h\s*\d{2})\D*Au\s*[:\s]*[\s\S]*?(\d{1,2}\s*:\s*\d{2}|\d{1,2}\s*h\s*\d{2})/i
  );
  if (duAuTimes?.[1] && duAuTimes[2]) {
    start = normalizeTime(duAuTimes[1].replace(/\s/g, ""));
    end = normalizeTime(duAuTimes[2].replace(/\s/g, ""));
  }
  if (!start || !end) {
    const duBlock = flat.match(
      /\bDu\s*[:\s]([\s\S]*?)(?=\bAu\s*[:\s]|\bSalle\s*[:\s]|\bStatut\b|$)/i
    );
    const auBlock = flat.match(
      /\bAu\s*[:\s]([\s\S]*?)(?=\bSalle\s*[:\s]|\bStatut\b|\bRessources\b|$)/i
    );
    if (!start && duBlock?.[1]) start = pickTimeFromSegment(duBlock[1]);
    if (!end && auBlock?.[1]) end = pickTimeFromSegment(auBlock[1]);
  }
  if (!start) {
    const mDu = flat.match(
      /\bDu\s*[:\s][\s\S]*?[àÀa]\s*(\d{1,2}\s*:\s*\d{2}|\d{1,2}\s*h\s*\d{2})/i
    );
    if (mDu?.[1]) start = normalizeTime(mDu[1].replace(/\s/g, ""));
  }
  if (!end) {
    const mAu = flat.match(
      /\bAu\s*[:\s][\s\S]*?[àÀa]\s*(\d{1,2}\s*:\s*\d{2}|\d{1,2}\s*h\s*\d{2})/i
    );
    if (mAu?.[1]) end = normalizeTime(mAu[1].replace(/\s/g, ""));
  }

  let room: string | null = null;
  const mSalle = flat.match(
    /\bSalle\s*[:\s]+(.+?)(?=\s+(?:Nom|Prénom|Code|Libellé|Matière|Du\s*:|Au\s*:|Statut|Type|Ressources|Groupes|Intervenant|Description)\b|$)/i
  );
  if (mSalle?.[1]) room = normalizeText(mSalle[1]);

  if (!room) {
    const mSalle2 = flat.match(/\bSalle\s*[:\s]+(.+?)(?=\s{2,}|$)/i);
    if (mSalle2?.[1]) room = normalizeText(mSalle2[1]);
  }

  if (room) {
    room = room
      .replace(/NomPr(?:énom)?.*$/i, "")
      .replace(/Nom\s*Prénom.*$/i, "")
      .trim();
    room = normalizeText(room) || null;
  }

  let date: string | null = null;
  const mDate = flat.match(
    /\bDu\s*[:\s]*[a-zàâäéèêëîïôùûüç]+\s+(\d{1,2})\s+([a-zàâäéèêëîïôùûüç]+)\s+(\d{4})\b/i
  );
  if (mDate) {
    const mm = MOIS_FR[stripFrAccents(mDate[2])];
    if (mm) {
      date = `${mDate[3]}-${mm}-${mDate[1].padStart(2, "0")}`;
    }
  }

  return { course, start, end, room, date };
}

async function extractFromModal(
  _page: Page,
  modal: Locator,
  eventIndex: number
): Promise<TimetableEvent | null> {
  // Use Playwright locators scoped to the visible `modal` element.
  // This avoids the critical PrimeFaces hidden-dialog bug: PrimeFaces
  // pre-renders ALL dialogs in the DOM but hidden. document.querySelector
  // inside page.evaluate would grab the first match regardless of visibility.
  // Playwright locators are visibility-aware by design.

  const body = modal.locator(".ui-dialog-content").first();
  const rawBody =
    (await body.innerText().catch(() => null))?.trim() ||
    ((await body.textContent().catch(() => "")) ?? "");
  const titleBar =
    (await modal.locator(".ui-dialog-title").first().innerText().catch(() => null))?.trim() ||
    ((await modal
      .locator(".ui-dialog-title")
      .first()
      .textContent()
      .catch(() => "")) ?? "");
  const combinedRaw = [rawBody, titleBar].filter(Boolean).join("\n");
  const text = normalizeText(combinedRaw);
  if (!text.trim()) {
    logger.debug("parser", `modal #${eventIndex} is empty`);
    return null;
  }

  const lise = parseLiseMatiereDuAuSalle(combinedRaw);

  const titleSel = MODAL_SELECTORS.modalTitle.join(", ");
  let course = lise.course;
  if (!course.trim()) {
    course = normalizeText(
      (await modal.locator(titleSel).first().textContent().catch(() => null)) ?? ""
    );
  }
  if (!course.trim()) {
    const libelle = combinedRaw.match(/Libellé\s*[:\s]*([^\n]+)/im);
    if (libelle?.[1]) course = normalizeText(libelle[1]);
  }
  if (!course.trim()) {
    const lines = text
      .split(/\n/)
      .map((l) => normalizeText(l))
      .filter((l) => l.length > 2 && !/^voir$/i.test(l));
    course = lines.find((l) => !parseTimeRange(l)) ?? lines[0] ?? "";
  }

  let start = lise.start;
  let end = lise.end;
  if (!start || !end) {
    let timeRange = parseTimeRange(text);
    if (!timeRange) {
      for (const line of text.split(/\n/)) {
        timeRange = parseTimeRange(line);
        if (timeRange) break;
      }
    }
    if (!start && timeRange?.start) start = timeRange.start;
    if (!end && timeRange?.end) end = timeRange.end;
  }

  let date: string | null = lise.date;
  if (!date) {
    const dateMatchISO = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    const dateMatchFR = text.match(/(\d{1,2})\/(\d{2})\/(\d{4})/);
    if (dateMatchISO) {
      date = dateMatchISO[0];
    } else if (dateMatchFR) {
      date = `${dateMatchFR[3]}-${dateMatchFR[2]}-${dateMatchFR[1].padStart(2, "0")}`;
    }
  }

  let room: string | null = lise.room;
  if (!room?.trim()) {
    const roomSel = MODAL_SELECTORS.roomField.join(", ");
    const roomTxt = await modal
      .locator(roomSel)
      .first()
      .textContent()
      .catch(() => null);
    room = roomTxt?.trim() ? normalizeText(roomTxt) : null;
  }
  if (!room) {
    const roomMatch = text.match(
      /(?:Salle|Amphi|Labo(?:ratoire)?|Lab|Atelier|Bât\.?\s*\w+|Room)\s+[\w\d/.-]+/i
    );
    room = roomMatch ? normalizeText(roomMatch[0]) : null;
  }

  // ── Teacher ───────────────────────────────────────────────────────────────
  const teacherSel = MODAL_SELECTORS.teacherField.join(", ");
  let teacher: string | null = await modal
    .locator(teacherSel)
    .first()
    .textContent()
    .catch(() => null);
  if (teacher?.trim()) {
    teacher = normalizeText(teacher);
    // `[class*="prof"]` can match large layout wrappers; ignore unusable blobs.
    if (teacher.length > 120) teacher = null;
  }
  if (!teacher?.trim()) {
    const teacherFromLabel = text.match(
      /(?:Enseignant|Professeur|Prof|Intervenant)[\s:]+([^\n,;]+)/i
    );
    const teacherFromName = text.match(
      /(?:M\.|Mme\.?|Dr\.?|Pr\.?)\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ][a-zàâäéèêëîïôùûüç'-]+/
    );
    teacher =
      teacherFromLabel?.[1]?.trim() ??
      teacherFromName?.[0]?.trim()  ??
      null;
  }

  // ── Status ────────────────────────────────────────────────────────────────
  const statusMatch = text.match(/\b(Annulé|Déplacé|Reporté|Rattrapé|Suspendu)\b/i);
  const status = statusMatch ? statusMatch[1] : null;

  if (!course.trim() && !start) {
    logger.debug("parser", `modal #${eventIndex} yielded no course or time — skipping`);
    return null;
  }

  return {
    course:       normalizeText(course),
    date,
    start,
    end,
    room,
    teacher,
    status,
    teachingType: detectTeachingType(course),
  };
}

// ─── Modal lifecycle helpers ──────────────────────────────────────────────────

async function closeModal(page: Page, modal: Locator): Promise<void> {
  const closeBtn = modal.locator(MODAL_SELECTORS.closeButton.join(", ")).first();
  const closed = await closeBtn
    .click({ timeout: 2_000 })
    .then(() => true)
    .catch(() => false);

  if (!closed) {
    // Fallback: press Escape
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(200);
  }

  // Confirm modal is gone
  await modal.waitFor({ state: "hidden", timeout: 3_000 }).catch(() => {});
}

async function dismissAnyOverlay(page: Page): Promise<void> {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);
}

// ─── Calendar readiness ───────────────────────────────────────────────────────

async function waitForCalendarReady(page: Page): Promise<void> {
  await page
    .waitForSelector(PLANNING_SELECTORS.calendarContainer.join(", "), {
      state: "visible",
      timeout: TIMEOUTS.calendarRender,
    })
    .catch(() => {
      throw new Error(
        `Calendar container not found — tried: ${PLANNING_SELECTORS.calendarContainer.join(", ")}`
      );
    });

  await waitForAjaxIdle(
    page,
    PLANNING_SELECTORS.ajaxLoadingIndicator.join(", ")
  );

  // Let any React / FullCalendar re-render settle
  await page.waitForTimeout(500);
}

// ─── Event merge ─────────────────────────────────────────────────────────────

/**
 * Merge inline (pass 1) and modal (pass 2) results.
 * Modal wins on all fields; inline data fills null gaps.
 * Deduplication key: lowercase course prefix (first 6 chars).
 */
function mergeEvents(
  inline: TimetableEvent[],
  modal: TimetableEvent[]
): TimetableEvent[] {
  if (modal.length === 0) return inline;

  const usedInline = new Set<number>();
  const merged = modal.map((m) => {
    const matchIdx = inline.findIndex((il, idx) => {
      if (usedInline.has(idx)) return false;
      const a = il.course.toLowerCase().slice(0, 6);
      const b = m.course.toLowerCase().slice(0, 6);
      return Boolean(a && b && a === b);
    });
    const match = matchIdx >= 0 ? inline[matchIdx] : undefined;
    if (matchIdx >= 0) usedInline.add(matchIdx);

    return {
      ...m,
      start:  m.start  || match?.start  || "",
      end:    m.end    || match?.end    || "",
      room:   m.room   ?? match?.room   ?? null,
      date:   m.date   ?? match?.date   ?? null,
    };
  });

  const unmatched = inline.filter((_, idx) => !usedInline.has(idx));
  return [...merged, ...unmatched];
}

// ─── Heuristics ───────────────────────────────────────────────────────────────

/**
 * Infer teaching type from course name string.
 * Returns null if no clear pattern is found.
 */
function detectTeachingType(course: string): string | null {
  const c = course.toUpperCase();
  if (/\bCM\b/.test(c))  return "CM";
  if (/\bTD\b/.test(c))  return "TD";
  if (/\bTP\b/.test(c))  return "TP";
  if (/\bPROJ/.test(c))  return "PROJET";
  return null;
}
