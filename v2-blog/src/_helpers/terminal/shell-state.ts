/** Which view the books terminal is in: a listing of books or a single book. */
export type RouteMode = "listing" | "detail";

/**
 * Single source of truth for the books terminal's internal view and lifecycle
 * state. Replaces the previously scattered reactive flags (see ADR-0001).
 */
export interface ShellState {
  routeMode: RouteMode;
  isMobile: boolean;
  sidebarOpen: boolean;
  booted: boolean;
  focused: boolean;
  bootStarted: boolean;
  interactionReady: boolean;
  bookDataLoaded: boolean;
  skipAnimations: boolean;
  isTyping: boolean;
  command: string;
  booksDisplayed: number;
}

/** All state transitions the books terminal can perform. */
export type ShellAction =
  | { type: "INITIALIZED"; routeMode: RouteMode }
  | { type: "VIEWPORT_CHANGED"; isMobile: boolean }
  | { type: "SIDEBAR_SET"; open: boolean }
  | { type: "BOOTED" }
  | { type: "BOOT_STARTED" }
  | { type: "INTERACTION_READY" }
  | { type: "BOOK_DATA_LOADED" }
  | { type: "INPUT_CHANGED"; value: string }
  | { type: "TYPING_SET"; typing: boolean }
  | { type: "FOCUS_SET"; focused: boolean }
  | { type: "ANIMATIONS_TOGGLED" }
  | { type: "BOOKS_ADVANCED"; count: number };

/**
 * Builds the initial shell state. Environment-derived defaults (viewport,
 * reduced-motion) are injected by the caller so the reducer stays pure.
 *
 * @param opts - Optional initial `isMobile` / `skipAnimations` values.
 * @returns A fresh `ShellState`.
 */
export function createInitialShellState(
  opts: { isMobile?: boolean; skipAnimations?: boolean } = {}
): ShellState {
  return {
    routeMode: "detail",
    isMobile: opts.isMobile ?? false,
    sidebarOpen: false,
    booted: false,
    focused: false,
    bootStarted: false,
    interactionReady: false,
    bookDataLoaded: false,
    skipAnimations: opts.skipAnimations ?? false,
    isTyping: false,
    command: "",
    booksDisplayed: 0,
  };
}

/**
 * Pure reducer: derives the next shell state from the current state and an action.
 *
 * @param state - The current state.
 * @param action - The transition to apply.
 * @returns The next state (a new object; `state` is never mutated).
 */
export function shellReducer(state: ShellState, action: ShellAction): ShellState {
  switch (action.type) {
    case "INITIALIZED":
      return { ...state, routeMode: action.routeMode };
    case "VIEWPORT_CHANGED":
      return {
        ...state,
        isMobile: action.isMobile,
        sidebarOpen: action.isMobile ? state.sidebarOpen : false,
      };
    case "SIDEBAR_SET":
      return { ...state, sidebarOpen: action.open };
    case "BOOTED":
      return { ...state, booted: true, focused: true };
    case "BOOT_STARTED":
      return { ...state, bootStarted: true };
    case "INTERACTION_READY":
      return { ...state, interactionReady: true };
    case "BOOK_DATA_LOADED":
      return { ...state, bookDataLoaded: true };
    case "INPUT_CHANGED":
      return { ...state, command: action.value };
    case "TYPING_SET":
      return { ...state, isTyping: action.typing };
    case "FOCUS_SET":
      return { ...state, focused: action.focused };
    case "ANIMATIONS_TOGGLED":
      return { ...state, skipAnimations: !state.skipAnimations };
    case "BOOKS_ADVANCED":
      return { ...state, booksDisplayed: state.booksDisplayed + action.count };
    default:
      return state;
  }
}
