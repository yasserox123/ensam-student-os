/**
 * Browser / session lifecycle management for the ENSAM LISE platform.
 *
 * Responsibilities:
 *   - Shared, lazily-initialised browser singleton
 *   - Login flow with proper error classification
 *   - Session validity check
 *   - Re-login (session refresh) on expiry
 *   - Clean shutdown
 *
 * Everything in this module is self-contained and can be unit-tested
 * by injecting a mock Browser object.
 */

import { chromium, Browser, BrowserContext, Page } from "playwright";
import { ENSAMCredentials, ENSAMSession } from "./types";
import { URLS, LOGIN_SELECTORS, TIMEOUTS, isLoginSurfaceHref } from "./selectors";
import { LoginError, SessionExpiredError } from "./errors";
import { logger } from "./logger";
import { resolveFirstVisible, saveDebugScreenshot, saveDebugHtml } from "./utils";

// ─── Browser singleton ───────────────────────────────────────────────────────

let _browser: Browser | null = null;

const isDebug = process.env.ENSAM_DEBUG === "1";

/**
 * Return the shared Chromium instance, launching it first if needed.
 * In debug mode the browser runs in headed mode so you can watch actions live.
 */
export async function getBrowser(): Promise<Browser> {
  if (!_browser || !_browser.isConnected()) {
    logger.info("browser", `launching Chromium (headless: ${!isDebug})`);
    _browser = await chromium.launch({
      headless: !isDebug,
      slowMo: isDebug ? 120 : 0,    // slows down actions for observation in debug
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    _browser.on("disconnected", () => {
      logger.warn("browser", "browser disconnected unexpectedly — singleton cleared");
      _browser = null;
    });
  }
  return _browser;
}

/**
 * Close the shared browser instance and clear the singleton.
 * Always call this in `finally` blocks or process exit hooks.
 */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    logger.info("browser", "closing browser");
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

// ─── Login ───────────────────────────────────────────────────────────────────

/**
 * Authenticate against ENSAM LISE and return a usable session.
 *
 * The returned session owns its BrowserContext — close it via `closeSession()`
 * when done to release resources promptly.
 *
 * Throws `LoginError` on bad credentials or UI failure.
 */
export async function login(credentials: ENSAMCredentials): Promise<ENSAMSession> {
  const browser = await getBrowser();

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "fr-FR",
  });

  const page = await context.newPage();

  try {
    logger.info("auth", "opening login page");
    await page.goto(URLS.login, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUTS.navigation,
    });

    logger.debug("auth", "page loaded", { url: page.url() });

    await fillLoginForm(page, credentials);

    logger.info("auth", "submitting login form");
    await submitLoginAndWait(page);

    await assertLoginSucceeded(page);

    logger.info("auth", `login succeeded — redirected to ${page.url()}`);

    return { context, page, loggedInAt: new Date() };
  } catch (err) {
    // Best-effort: save screenshot for post-mortem analysis
    if (isDebug) {
      await saveDebugScreenshot(page, "login_failure");
      await saveDebugHtml(page, "login_failure");
    }
    await context.close().catch(() => {});
    // Re-wrap only if it isn't already a typed error
    if (err instanceof LoginError) throw err;
    throw new LoginError((err as Error).message);
  }
}

// ─── Session management ───────────────────────────────────────────────────────

/**
 * Return true when the session is still alive and on an authenticated page.
 */
export async function isSessionValid(page: Page): Promise<boolean> {
  try {
    if (page.isClosed()) return false;
    const url = page.url();
    return url.length > 0 && !isLoginSurfaceHref(url);
  } catch {
    return false;
  }
}

/**
 * Re-authenticate an expired session in-place.
 * Reuses the same BrowserContext so existing cookies/state are reset cleanly.
 *
 * Throws `SessionExpiredError` structurally, then delegates to `login()`.
 */
export async function refreshSession(
  session: ENSAMSession,
  credentials: ENSAMCredentials
): Promise<ENSAMSession> {
  logger.warn("auth", "session expired — attempting re-login");
  await closeSession(session);

  const fresh = await login(credentials);
  logger.info("auth", "re-login successful");
  return fresh;
}

/**
 * Close the browser context associated with a session.
 * Safe to call multiple times.
 */
export async function closeSession(session: ENSAMSession): Promise<void> {
  logger.info("auth", "closing session");
  await session.context.close().catch(() => {});
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function fillLoginForm(
  page: Page,
  credentials: ENSAMCredentials
): Promise<void> {
  // ── Username ──
  logger.debug("auth", "locating username field");
  const usernameInput = await resolveFirstVisible(
    page,
    LOGIN_SELECTORS.usernameInput,
    TIMEOUTS.elementProbe
  );
  if (!usernameInput) {
    throw new LoginError("username input not found on login page");
  }
  await usernameInput.click();
  await usernameInput.fill(credentials.username);
  logger.debug("auth", "username filled");

  // ── Password ──
  logger.debug("auth", "locating password field");
  const passwordInput = await resolveFirstVisible(
    page,
    LOGIN_SELECTORS.passwordInput,
    TIMEOUTS.elementProbe
  );
  if (!passwordInput) {
    throw new LoginError("password input not found on login page");
  }
  await passwordInput.fill(credentials.password);
  logger.debug("auth", "password filled");

  // Brief human-like pause before submitting
  await page.waitForTimeout(300 + Math.random() * 200);
}

async function submitLoginAndWait(page: Page): Promise<void> {
  const loginBtn = await resolveFirstVisible(
    page,
    LOGIN_SELECTORS.loginButton,
    TIMEOUTS.elementProbe
  );
  if (!loginBtn) {
    throw new LoginError("login button not found");
  }

  const leftLoginUrl = (u: URL) => !isLoginSurfaceHref(u.href);
  const successMenu = page.locator(LOGIN_SELECTORS.successIndicator.join(", ")).first();
  const loginError = page.locator(LOGIN_SELECTORS.errorMessage.join(", ")).first();

  // Success: URL leaves login surface or app shell appears. Failure: error banner (~fast).
  await loginBtn.click();
  await Promise.race([
    page.waitForURL(leftLoginUrl, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUTS.navigation,
    }),
    successMenu.waitFor({ state: "visible", timeout: TIMEOUTS.navigation }),
    loginError.waitFor({ state: "visible", timeout: TIMEOUTS.navigation }),
  ]).catch(() => {
    /* handled by assertLoginSucceeded */
  });

  // Brief settle for JSF to paint messages / layout after navigation or ajax.
  await page.waitForLoadState("domcontentloaded").catch(() => {});
}

async function assertLoginSucceeded(page: Page): Promise<void> {
  const url = page.url();

  if (isLoginSurfaceHref(url)) {
    // Still on login surface — Spring /login or JSF Login.xhtml; read error message
    const errorEl = await resolveFirstVisible(
      page,
      LOGIN_SELECTORS.errorMessage,
      2_000
    );

    let errorText = "still on login page after form submission";
    if (errorEl) {
      errorText = (await errorEl.innerText().catch(() => "")).trim() || errorText;
    }
    throw new LoginError(errorText);
  }

  // Verify that the authenticated layout is actually rendered
  const menuVisible = await resolveFirstVisible(
    page,
    LOGIN_SELECTORS.successIndicator,
    5_000
  );

  if (!menuVisible) {
    logger.warn(
      "auth",
      "success indicator not found — treating as success based on URL leaving login surface",
      { url }
    );
    // Not throwing — URL left login flow. Selector may have changed on new LISE builds.
  }
}

// ─── Session guard (convenience wrapper) ─────────────────────────────────────

/**
 * Assert that the session is valid before an operation.
 * Throws `SessionExpiredError` if the page has been redirected to login.
 */
export function assertSessionValid(page: Page): void {
  // Synchronous URL check (page.url() is synchronous in Playwright)
  if (page.isClosed()) throw new SessionExpiredError();
  const url = page.url();
  if (isLoginSurfaceHref(url)) {
    throw new SessionExpiredError();
  }
}
