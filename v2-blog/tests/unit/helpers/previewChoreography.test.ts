import { describe, expect, it } from "vitest";
import {
  PreviewChoreography,
  type ChoreographyCommand,
  type PreviewTarget,
} from "../../../src/_helpers/previewChoreography.ts";

const ROUND: PreviewTarget = { src: "/a.webp", type: "image" };
const ROUND_B: PreviewTarget = { src: "/b.webp", type: "image" };
const ALBUM: PreviewTarget = { src: "/song.mp3", type: "audio", kind: "album" };

function reveal(
  machine: PreviewChoreography,
  target: PreviewTarget,
  opts: { cursor?: { x: number; y: number }; immediate?: boolean; reducedMotion?: boolean } = {}
) {
  return machine.reveal({ target, cursor: opts.cursor ?? { x: 0, y: 0 }, ...opts });
}

/** Pulls the `gen` out of a command batch's `startCollapse` — asserts it's there. */
function collapseGen(commands: ChoreographyCommand[]): number {
  const startCollapse = commands.find((c) => c.type === "startCollapse");
  if (!startCollapse) throw new Error("expected a startCollapse command");
  return startCollapse.gen;
}

describe("PreviewChoreography — hover intent", () => {
  it("a sweep (large travel per tick) never shows", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ROUND, { cursor: { x: 0, y: 0 } });
    expect(machine.state).toBe("pending-intent");

    const commands = machine.intentTick({ x: 50, y: 0 });
    expect(commands).toEqual([]);
    expect(machine.state).toBe("pending-intent");
  });

  it("settling (small travel per tick) shows", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ROUND, { cursor: { x: 0, y: 0 } });

    const commands = machine.intentTick({ x: 2, y: 0 });
    expect(commands).toEqual([{ type: "stopIntentSampler" }, { type: "show", target: ROUND }]);
    expect(machine.state).toBe("visible");
  });

  it("keeps sampling across multiple sweeping ticks, then shows once settled", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ROUND, { cursor: { x: 0, y: 0 } });

    for (let i = 1; i <= 5; i++) {
      expect(machine.intentTick({ x: i * 50, y: 0 })).toEqual([]);
    }
    expect(machine.state).toBe("pending-intent");

    const last = 5 * 50;
    expect(machine.intentTick({ x: last + 2, y: 0 })).toEqual([
      { type: "stopIntentSampler" },
      { type: "show", target: ROUND },
    ]);
  });

  it("immediate reveal (keyboard focus) skips the sampler entirely", () => {
    const machine = new PreviewChoreography();
    const commands = reveal(machine, ROUND, { immediate: true });
    expect(commands).toEqual([{ type: "show", target: ROUND }]);
    expect(machine.state).toBe("visible");
  });

  it("a stray intentTick outside pending-intent is a no-op", () => {
    const machine = new PreviewChoreography();
    expect(machine.intentTick({ x: 0, y: 0 })).toEqual([]);
    expect(machine.state).toBe("hidden");
  });
});

describe("PreviewChoreography — warm state", () => {
  it("hide() while visible starts a linger, not an immediate collapse", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ROUND, { immediate: true });

    const commands = machine.hide();
    expect(commands).toEqual([{ type: "startLinger" }]);
    expect(machine.state).toBe("lingering");
  });

  it("lingerElapsed collapses; collapseFinished tears down", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ROUND, { immediate: true });
    machine.hide();

    const collapseCommands = machine.lingerElapsed();
    expect(collapseCommands).toEqual([{ type: "startCollapse", gen: expect.any(Number) }]);
    expect(machine.state).toBe("collapsing");

    const finishCommands = machine.collapseFinished(collapseGen(collapseCommands));
    expect(finishCommands).toEqual([{ type: "teardown" }]);
    expect(machine.state).toBe("hidden");
    expect(machine.target).toBeNull();
  });

  it("reveal within the linger cancels it and swaps instantly (warm sibling)", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ROUND, { immediate: true });
    machine.hide();
    expect(machine.state).toBe("lingering");

    const commands = reveal(machine, ROUND_B, { cursor: { x: 5, y: 5 } });
    expect(commands).toEqual([{ type: "cancelLinger" }, { type: "show", target: ROUND_B }]);
    expect(machine.state).toBe("visible");
    expect(machine.target).toEqual(ROUND_B);
  });

  it("repeated hide() while already lingering is a no-op", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ROUND, { immediate: true });
    machine.hide();
    expect(machine.hide()).toEqual([]);
    expect(machine.state).toBe("lingering");
  });

  it("a pending (not-yet-shown) preview drops at once on hide()", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ROUND, { cursor: { x: 0, y: 0 } });
    expect(machine.state).toBe("pending-intent");

    const commands = machine.hide();
    expect(commands).toEqual([
      { type: "stopIntentSampler" },
      { type: "startCollapse", gen: expect.any(Number) },
    ]);
    expect(machine.state).toBe("collapsing");
  });
});

describe("PreviewChoreography — album shape-swap defer", () => {
  it("album -> round while visible defers behind a full collapse", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ALBUM, { immediate: true });

    const commands = reveal(machine, ROUND, { immediate: true });
    expect(commands).toEqual([{ type: "startCollapse", gen: expect.any(Number) }]);
    expect(machine.state).toBe("deferring");
    // The old target is retained until the deferred reveal actually happens.
    expect(machine.target).toEqual(ALBUM);
  });

  it("collapseFinished after a defer tears down and reveals the deferred target", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ALBUM, { immediate: true });
    const gen = collapseGen(reveal(machine, ROUND, { immediate: true }));

    const commands = machine.collapseFinished(gen);
    expect(commands).toEqual([
      { type: "teardown" },
      { type: "revealDeferred", target: ROUND, opts: { immediate: true, reducedMotion: false } },
    ]);
    expect(machine.state).toBe("hidden");
  });

  it("reduced motion skips the defer: same-tick instant swap instead", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ALBUM, { immediate: true });

    const commands = reveal(machine, ROUND, { immediate: true, reducedMotion: true });
    expect(commands).toEqual([{ type: "show", target: ROUND }]);
    expect(machine.state).toBe("visible");
  });

  it("a newer reveal during a pending collapse supersedes it: stale collapseFinished yields nothing", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ALBUM, { immediate: true });
    const staleGen = collapseGen(reveal(machine, ROUND, { immediate: true }));

    // A second, newer reveal arrives before the first collapse resolves.
    reveal(machine, ROUND_B, { immediate: true });

    expect(machine.collapseFinished(staleGen)).toEqual([]);
  });

  it("round -> round (same shape) never defers, even while visible", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ROUND, { immediate: true });

    const commands = reveal(machine, ROUND_B, { immediate: true });
    expect(commands).toEqual([{ type: "show", target: ROUND_B }]);
    expect(machine.state).toBe("visible");
  });

  it("hide() while deferring cancels the deferred reveal (superseded by the new collapse)", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ALBUM, { immediate: true });
    reveal(machine, ROUND, { immediate: true });
    expect(machine.state).toBe("deferring");

    const hideCommands = machine.hide();
    expect(hideCommands).toEqual([{ type: "startCollapse", gen: expect.any(Number) }]);

    expect(machine.collapseFinished(collapseGen(hideCommands))).toEqual([{ type: "teardown" }]);
  });
});

describe("PreviewChoreography — commit / stop", () => {
  it("commit shows and marks the target committed", () => {
    const machine = new PreviewChoreography();
    const commands = machine.commit(ALBUM);
    expect(commands).toEqual([{ type: "show", target: ALBUM }]);
    expect(machine.isCommitted).toBe(true);
    expect(machine.target).toEqual(ALBUM);
  });

  it("committing the already-committed src toggles off (stop semantics)", () => {
    const machine = new PreviewChoreography();
    machine.commit(ALBUM);

    const commands = machine.commit(ALBUM);
    expect(commands).toEqual([
      { type: "stopPlayback" },
      { type: "startCollapse", gen: expect.any(Number) },
    ]);
    expect(machine.isCommitted).toBe(false);
    expect(machine.state).toBe("collapsing");
  });

  it("committing a different src while one is committed stops the old and starts the new", () => {
    const machine = new PreviewChoreography();
    machine.commit(ALBUM);

    const commands = machine.commit(ROUND);
    expect(commands).toEqual([{ type: "stopPlayback" }, { type: "show", target: ROUND }]);
    expect(machine.isCommitted).toBe(true);
    expect(machine.target).toEqual(ROUND);
  });

  it("revealing the src that is already committed is a no-op", () => {
    const machine = new PreviewChoreography();
    machine.commit(ALBUM);

    expect(reveal(machine, ALBUM, { immediate: true })).toEqual([]);
    expect(machine.isCommitted).toBe(true);
    expect(machine.state).toBe("visible");
  });

  it("stop() always collapses at once, never lingers, even for a mere glimpse", () => {
    const machine = new PreviewChoreography();
    reveal(machine, ROUND, { immediate: true });

    const commands = machine.stop();
    expect(commands).toEqual([
      { type: "stopPlayback" },
      { type: "startCollapse", gen: expect.any(Number) },
    ]);
    expect(machine.state).toBe("collapsing");
  });

  it("stop() while committed pauses playback and collapses", () => {
    const machine = new PreviewChoreography();
    machine.commit(ALBUM);

    const commands = machine.stop();
    expect(commands).toEqual([
      { type: "stopPlayback" },
      { type: "startCollapse", gen: expect.any(Number) },
    ]);
    expect(machine.isCommitted).toBe(false);
  });
});
