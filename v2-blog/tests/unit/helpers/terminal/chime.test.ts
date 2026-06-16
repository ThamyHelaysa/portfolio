import { beforeEach, describe, expect, it, vi } from "vitest";

import { CHIME_KEY, playFirstSummonChime } from "../../../../src/_helpers/terminal/chime.ts";

/** Minimal in-memory Storage stand-in. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

/** A spyable AudioContext stub good enough for the synth graph. */
function fakeAudioContext() {
  const osc = {
    type: "",
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const gain = {
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };
  return {
    currentTime: 0,
    destination: {},
    state: "running",
    resume: vi.fn(),
    createOscillator: vi.fn(() => osc),
    createGain: vi.fn(() => gain),
    _osc: osc,
    _gain: gain,
  };
}

let storage: Storage;

beforeEach(() => {
  storage = fakeStorage();
});

describe("playFirstSummonChime", () => {
  it("plays once and records the persistent flag", () => {
    const ctx = fakeAudioContext();
    const createAudioContext = vi.fn(() => ctx as unknown as AudioContext);

    const played = playFirstSummonChime({
      storage,
      prefersReducedMotion: () => false,
      createAudioContext,
    });

    expect(played).toBe(true);
    expect(createAudioContext).toHaveBeenCalledTimes(1);
    expect(ctx.createOscillator).toHaveBeenCalled(); // it built the graph
    expect(storage.getItem(CHIME_KEY)).not.toBeNull();
  });

  it("never plays a second time in the same session", () => {
    const createAudioContext = vi.fn(() => fakeAudioContext() as unknown as AudioContext);
    const deps = { storage, prefersReducedMotion: () => false, createAudioContext };

    expect(playFirstSummonChime(deps)).toBe(true);
    expect(playFirstSummonChime(deps)).toBe(false);
    expect(createAudioContext).toHaveBeenCalledTimes(1);
  });

  it("is skipped under prefers-reduced-motion and does not consume the flag", () => {
    const createAudioContext = vi.fn(() => fakeAudioContext() as unknown as AudioContext);

    const played = playFirstSummonChime({
      storage,
      prefersReducedMotion: () => true,
      createAudioContext,
    });

    expect(played).toBe(false);
    expect(createAudioContext).not.toHaveBeenCalled();
    expect(storage.getItem(CHIME_KEY)).toBeNull(); // a later non-reduced visit can still chime
  });

  it("no-ops without consuming the flag when Web Audio is unavailable", () => {
    const played = playFirstSummonChime({
      storage,
      prefersReducedMotion: () => false,
      createAudioContext: () => null,
    });

    expect(played).toBe(false);
    expect(storage.getItem(CHIME_KEY)).toBeNull();
  });
});
