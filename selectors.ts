/**
 * Central selector registry for the ENSAM LISE platform.
 *
 * RULES (enforced here, not scattered across modules):
 *   1. NEVER use generated JSF IDs (j_idt..., j_id_...).
 *   2. Prefer: placeholder text, ARIA labels, role, stable class names, text content.
 *   3. Every critical selector is an ordered array — first match wins.
 *      Less-stable selectors go at the end of the array as last resort.
 *   4. If ENSAM changes their UI, only this file needs updating.
 *
 * Selector types used:
 *   - CSS attribute selectors: input[placeholder*="..."]
 *   - Playwright text selectors: button:has-text("...")
 *   - ARIA roles: [role="dialog"]
 *   - Stable PrimeFaces / FullCalendar class names (.ui-*, .fc-*)
 */

// ─── URLs ─────────────────────────────────────────────────────────────────────

export const URLS = {
  login:    "https://lise.ensam.eu/faces/Login.xhtml",
  planning: "https://lise.ensam.eu/faces/Planning.xhtml",
  home:     "https://lise.ensam.eu/faces/MainMenuPage.xhtml",
} as const;

/**
 * True while the user is still on an unauthenticated login screen.
 * LISE uses JSF `Login.xhtml` and Spring Security `POST /login` with redirects to `/login` on failure.
 */
export function isLoginSurfaceHref(href: string): boolean {
  if (/login\.xhtml/i.test(href)) return true;
  try {
    const path = new URL(href).pathname.replace(/\/+$/, "") || "/";
    if (path === "/login") return true;
  } catch {
    /* ignore */
  }
  return false;
}

// ─── Timeouts ────────────────────────────────────────────────────────────────

export const TIMEOUTS = {
  /** Full page / navigation load. */
  navigation:     20_000,
  /** Wait for calendar grid to appear after navigation / menu ajax. */
  calendarRender: 30_000,
  /** Wait for JSF ajax cycle to complete. */
  ajaxUpdate:     10_000,
  /** Wait for event modal to open after a click (LISE ajax can be slow). */
  modalOpen:      18_000,
  /** Short element visibility probe. */
  elementProbe:    2_500,
} as const;

// ─── Login selectors ─────────────────────────────────────────────────────────

export const LOGIN_SELECTORS = {
  /**
   * Username field.
   * Try placeholder text first (most stable), then generic text input last.
   */
  usernameInput: [
    'input[placeholder*="Identifiant" i]',
    'input[placeholder*="identifiant" i]',
    'input[placeholder*="login" i]',
    'input[placeholder*="utilisateur" i]',
    'input[name*="username" i]',
    'input[name*="login" i]',
    'input[autocomplete="username"]',
    'form input[type="text"]',          // last resort — first text input in form
  ] as const,

  /** Password field — type="password" is reliable and stable. */
  passwordInput: [
    'input[type="password"]',
    'input[placeholder*="mot de passe" i]',
    'input[placeholder*="password" i]',
    'input[autocomplete="current-password"]',
  ] as const,

  /**
   * Login / submit button.
   * Text-based selectors are the most resilient to ID churn.
   */
  loginButton: [
    'button:has-text("Connexion")',
    'input[type="submit"][value*="Connexion"]',
    'button[type="submit"]:has-text("Se connecter")',
    'button[type="submit"]:has-text("Login")',
    'button[type="submit"]',            // last resort — first submit button
  ] as const,

  /**
   * Element that confirms successful login.
   * Absence of this after form submission means login failed.
   */
  successIndicator: [
    '.ui-menubar',
    'nav.menubar',
    '[class*="menu-principal"]',
    '[class*="menubar"]',
    '[class*="menu-bar"]',
    'ul.menu',
  ] as const,

  /**
   * Error / failure message shown by JSF after bad credentials.
   */
  errorMessage: [
    '.ui-messages-error',
    '.ui-message-error-detail',
    '[class*="error-message"]',
    '[class*="erreur"]',
    '.ui-growl-message-error',
  ] as const,
} as const;

// ─── Planning / calendar selectors ───────────────────────────────────────────

export const PLANNING_SELECTORS = {
  /**
   * Bare `/faces/Planning.xhtml` can render an empty shell (unknown rubrique).
   * Student timetable is opened from the slide menu under Scolarité.
   */
  menuScolarite: [
    'a.ui-submenu-link:has-text("Scolarité")',
  ] as const,

  menuStudentPlanning: [
    'a:has-text("Mon planning étudiant")',
  ] as const,

  /**
   * `<body>` classes once LISE has actually opened « Mon planning étudiant » (WebAurion).
   * Bare `Planning.xhtml` stays on `page-inconnue` / `id_rubrique_inconnu` until the rubrique loads.
   */
  studentPlanningBody: [
    "body.code_type_rubrique_MON_PLANNING_APPRENANT",
    'body[class*="MON_PLANNING_APPRENANT"]',
  ] as const,

  /**
   * Root calendar container.
   * PrimeFaces schedule renders either as .fc (FullCalendar) or .ui-schedule.
   */
  calendarContainer: [
    ".fc-view-container",
    ".fc",
    ".ui-schedule",
    '[class*="schedule-container"]',
    '[class*="planning-container"]',
    ".schedule",
  ] as const,

  /**
   * Individual event blocks inside the calendar grid.
   * FullCalendar v3 uses .fc-event; v4+ uses .fc-event-main wrapper.
   */
  eventBlock: [
    ".fc-event",
    ".fc-time-grid-event",
    ".fc-daygrid-event",
    ".ui-schedule-event",
    '[class*="event-block"]',
  ] as const,

  /**
   * Inline event title inside an event block.
   */
  eventTitle: [
    ".fc-title",
    ".fc-event-title",
    ".fc-event-title-container",
    '[class*="event-title"]',
    '[class*="event-name"]',
  ] as const,

  /**
   * Inline time range shown inside event block.
   */
  eventTime: [
    ".fc-time",
    ".fc-event-time",
    '[class*="event-time"]',
  ] as const,

  /**
   * "Next week" navigation button.
   * data-action is set by FullCalendar and is the most reliable.
   */
  nextWeekButton: [
    'button[data-action="next"]',
    ".fc-next-button",
    'button:has-text("Suivant")',
    '[aria-label*="next" i]',
    '[title*="suivant" i]',
    'button:has-text(">")',
  ] as const,

  /**
   * "Previous week" navigation button.
   */
  prevWeekButton: [
    'button[data-action="prev"]',
    ".fc-prev-button",
    'button:has-text("Précédent")',
    '[aria-label*="prev" i]',
    '[title*="précédent" i]',
    'button:has-text("<")',
  ] as const,

  /** "Today" navigation button — used to reset to current week. */
  todayButton: [
    'button[data-action="today"]',
    ".fc-today-button",
    'button:has-text("Aujourd\'hui")',
    'button:has-text("Aujourd")',
  ] as const,

  /**
   * The week range label in the calendar toolbar.
   * e.g. "12 mai – 16 mai 2025"
   */
  weekLabel: [
    ".fc-toolbar-title",
    ".fc-center h2",
    ".fc-center > *",
    '[class*="toolbar-title"]',
    '[class*="week-label"]',
  ] as const,

  /**
   * JSF / PrimeFaces ajax loading indicator.
   * Used to detect when an ajax cycle has started and ended.
   */
  ajaxLoadingIndicator: [
    ".ui-blockui",
    ".ui-blockui-content",
    '[class*="blockui"]',
    '[class*="loading-indicator"]',
    '[class*="ajax-status"]',
  ] as const,
} as const;

// ─── Modal / event detail overlay ────────────────────────────────────────────

export const MODAL_SELECTORS = {
  /**
   * The overlay / dialog container.
   * PrimeFaces dialog: .ui-dialog
   * PrimeFaces overlay panel: .ui-overlaypanel
   * Standard ARIA: [role="dialog"]
   */
  modalContainer: [
    '[id*="modaleDetail"]',
    ".ui-dialog",
    ".ui-overlaypanel",
    '[role="dialog"]',
    '[class*="modal-container"]',
    '[class*="event-detail"]',
  ] as const,

  /** Modal title bar text (course name is usually here). */
  modalTitle: [
    ".ui-dialog-title",
    '[class*="dialog-title"]',
    '[class*="modal-title"]',
    "h3",
    "h4",
  ] as const,

  /** Scrollable content area inside modal. */
  modalContent: [
    ".ui-dialog-content",
    '[class*="dialog-content"]',
    '[class*="modal-body"]',
    '[class*="modal-content"]',
  ] as const,

  /** Close button (X) in the modal title bar. */
  closeButton: [
    ".ui-dialog-titlebar-close",
    'button[aria-label*="close" i]',
    'button[aria-label*="fermer" i]',
    '[class*="close-button"]',
    '[class*="dialog-close"]',
  ] as const,

  // ── Structured field selectors inside modal content ───────────────────────

  courseNameField: [
    '[class*="titre"]',
    '[class*="cours-nom"]',
    '[class*="event-title"]',
    "h3",
    "h4",
    "strong",
  ] as const,

  roomField: [
    '[class*="salle"]',
    '[class*="room"]',
    '[class*="location"]',
    '[class*="lieu"]',
  ] as const,

  teacherField: [
    '[class*="enseignant"]',
    '[class*="teacher"]',
    '[class*="professeur"]',
    '[class*="prof"]',
  ] as const,
} as const;

// ─── Type helpers ─────────────────────────────────────────────────────────────

/** Union of all selector-group keys. */
export type SelectorGroup =
  | typeof LOGIN_SELECTORS
  | typeof PLANNING_SELECTORS
  | typeof MODAL_SELECTORS;
