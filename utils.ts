/**
 * Shared utility helpers.
 *
 * Keep this file small and focused on low-level, reusable operations only.
 * Business logic belongs in the module that owns it.
 */

import * as fs from "fs";
import * as path from "path";
import type { Page, Locator } from "playwright";
import { logger } from "./logger";

// ─── Selector resolution ─────────────────────────────────────────────────────

/**
 * Try a list of CSS/Playwright selectors in order and return the first
 * visible element found.  Returns null if nothing matches.
 */
export async function resolveFirstVisible(
  page: Page,
  selectors: readonly string[],
  timeoutMs = 2_000
): Promise<Locator | null> {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      const visible = await el.isVisible({ timeout: timeoutMs });
      if (visible) {
        logger.debug("utils", `selector matched: ${sel}`);
        return el;
      }
    } catch {
      // Selector did not match within timeout — try next
    }
  }
  return null;
}

/**
 * Wait for at most one selector from a list to become visible.
 * Throws if none is found within the combined timeout.
 */
export async function waitForAny(
  page: Page,
  selectors: readonly string[],
  timeoutMs = 5_000
): Promise<Locator> {
  const combined = selectors.join(", ");
  await page.waitForSelector(combined, { state: "visible", timeout: timeoutMs });
  // Return the first visible one
  const el = await resolveFirstVisible(page, selectors, timeoutMs);
  if (!el) throw new Error(`None of the selectors became visible: ${combined}`);
  return el;
}

// ─── Text normalisation ──────────────────────────────────────────────────────

/**
 * Collapse whitespace, strip zero-width characters, trim.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, "")  // zero-width chars
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Convert French time strings to "HH:MM".
 * Handles "8h00", "08:00", "8H30", "08h00".
 */
export function normalizeTime(raw: string): string {
  return raw
    .replace(/[Hh]/, ":")
    .replace(/^(\d):/, "0$1:")
    .trim();
}

/**
 * Extract a "HH:MM – HH:MM" pair from arbitrary text.
 * Returns null if not found.
 */
export function parseTimeRange(
  text: string
): { start: string; end: string } | null {
  let match = text.match(
    /(\d{1,2}[hH:]\d{2})\s*[-–—]\s*(\d{1,2}[hH:]\d{2})/
  );
  if (!match) {
    match =
      text.match(/(\d{1,2}:\d{2})\s*à\s*(\d{1,2}:\d{2})/i) ??
      text.match(/(\d{1,2}:\d{2})à(\d{1,2}:\d{2})/i) ??
      null;
  }
  if (!match) return null;
  return {
    start: normalizeTime(match[1]),
    end:   normalizeTime(match[2]),
  };
}

// ─── JSF / Ajax helpers ───────────────────────────────────────────────────────

/**
 * Wait for JSF ajax to go idle:
 *   1. Wait briefly for loading indicator to appear (optional).
 *   2. Wait for it to disappear.
 *   3. Add a short settle pause.
 *
 * Safe to call even when there is no loading indicator.
 */
export async function waitForAjaxIdle(
  page: Page,
  loadingIndicatorSelector: string,
  { appearTimeout = 1_000, hideTimeout = 8_000, settle = 400 } = {}
): Promise<void> {
  // Step 1 — may not appear if ajax is instantaneous
  await page
    .waitForSelector(loadingIndicatorSelector, {
      state: "visible",
      timeout: appearTimeout,
    })
    .catch(() => {});

  // Step 2 — wait for it to go away
  await page
    .waitForSelector(loadingIndicatorSelector, {
      state: "hidden",
      timeout: hideTimeout,
    })
    .catch(() => {});

  // Step 3 — settle time for JS re-renders
  await page.waitForTimeout(settle);
}

// ─── Debug / screenshot helpers ───────────────────────────────────────────────

const DEBUG_DIR = path.resolve(process.cwd(), "debug");

/**
 * Save a timestamped screenshot under the `debug/` folder.
 * Creates the folder if it doesn't exist.
 * Never throws — failure to save screenshot must not mask the real error.
 */
export async function saveDebugScreenshot(
  page: Page,
  label: string
): Promise<void> {
  try {
    if (page.isClosed()) {
      logger.warn("debug", "skip screenshot — page already closed");
      return;
    }
    if (!fs.existsSync(DEBUG_DIR)) {
      fs.mkdirSync(DEBUG_DIR, { recursive: true });
    }
    const filename = `${label}_${Date.now()}.png`;
    const filepath = path.join(DEBUG_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    logger.info("debug", `screenshot saved: ${filepath}`);
  } catch (screenshotErr) {
    logger.warn("debug", "failed to save screenshot", screenshotErr);
  }
}

/**
 * Save page HTML source to `debug/` folder.
 * Useful for offline analysis of selector failures.
 */
export async function saveDebugHtml(page: Page, label: string): Promise<void> {
  try {
    if (page.isClosed()) {
      logger.warn("debug", "skip HTML dump — page already closed");
      return;
    }
    if (!fs.existsSync(DEBUG_DIR)) {
      fs.mkdirSync(DEBUG_DIR, { recursive: true });
    }
    const filename = `${label}_${Date.now()}.html`;
    const filepath = path.join(DEBUG_DIR, filename);
    const html = await page.content();
    fs.writeFileSync(filepath, html, "utf-8");
    logger.info("debug", `page HTML saved: ${filepath}`);
  } catch (htmlErr) {
    logger.warn("debug", "failed to save page HTML", htmlErr);
  }
}
