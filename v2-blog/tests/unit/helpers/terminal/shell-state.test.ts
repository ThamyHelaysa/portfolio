import { describe, expect, it } from "vitest";

import { createInitialShellState, shellReducer } from "../../../../src/_helpers/terminal/shell-state.ts";

describe("shellReducer", () => {
  it("sets the route mode on INITIALIZED", () => {
    const state = createInitialShellState();

    const next = shellReducer(state, { type: "INITIALIZED", routeMode: "listing" });

    expect(next.routeMode).toBe("listing");
  });

  it("forces the sidebar closed when switching to desktop, but leaves it on mobile", () => {
    const open = { ...createInitialShellState(), isMobile: true, sidebarOpen: true };

    const toDesktop = shellReducer(open, { type: "VIEWPORT_CHANGED", isMobile: false });
    expect(toDesktop.isMobile).toBe(false);
    expect(toDesktop.sidebarOpen).toBe(false);

    const stayMobile = shellReducer(open, { type: "VIEWPORT_CHANGED", isMobile: true });
    expect(stayMobile.sidebarOpen).toBe(true);
  });

  it("opens and closes the sidebar with SIDEBAR_SET", () => {
    const state = createInitialShellState();

    expect(shellReducer(state, { type: "SIDEBAR_SET", open: true }).sidebarOpen).toBe(true);
    expect(shellReducer({ ...state, sidebarOpen: true }, { type: "SIDEBAR_SET", open: false }).sidebarOpen).toBe(false);
  });

  it("marks booted and focused together on BOOTED", () => {
    const next = shellReducer(createInitialShellState(), { type: "BOOTED" });

    expect(next.booted).toBe(true);
    expect(next.focused).toBe(true);
  });

  it("flips the run-once lifecycle latches", () => {
    const s = createInitialShellState();

    expect(shellReducer(s, { type: "BOOT_STARTED" }).bootStarted).toBe(true);
    expect(shellReducer(s, { type: "INTERACTION_READY" }).interactionReady).toBe(true);
    expect(shellReducer(s, { type: "BOOK_DATA_LOADED" }).bookDataLoaded).toBe(true);
  });

  it("stores the current command text on INPUT_CHANGED", () => {
    const next = shellReducer(createInitialShellState(), { type: "INPUT_CHANGED", value: "list --all" });
    expect(next.command).toBe("list --all");
  });

  it("sets typing and focus flags", () => {
    const s = createInitialShellState();
    expect(shellReducer(s, { type: "TYPING_SET", typing: true }).isTyping).toBe(true);
    expect(shellReducer({ ...s, focused: false }, { type: "FOCUS_SET", focused: true }).focused).toBe(true);
  });

  it("toggles skipAnimations", () => {
    const s = createInitialShellState();
    const on = shellReducer(s, { type: "ANIMATIONS_TOGGLED" });
    expect(on.skipAnimations).toBe(!s.skipAnimations);
    expect(shellReducer(on, { type: "ANIMATIONS_TOGGLED" }).skipAnimations).toBe(s.skipAnimations);
  });

  it("advances the books-displayed counter by a count", () => {
    const s = { ...createInitialShellState(), booksDisplayed: 3 };
    expect(shellReducer(s, { type: "BOOKS_ADVANCED", count: 3 }).booksDisplayed).toBe(6);
  });

  it("never mutates the input state and returns a new object", () => {
    const s = createInitialShellState();
    const frozen = Object.freeze({ ...s });

    const next = shellReducer(frozen, { type: "BOOTED" });

    expect(next).not.toBe(frozen);
    expect(frozen.booted).toBe(false);
  });

  it("returns the same state reference for an unknown action", () => {
    const s = createInitialShellState();
    // @ts-expect-error — exercising the default branch with an unknown action
    expect(shellReducer(s, { type: "NOPE" })).toBe(s);
  });
});
