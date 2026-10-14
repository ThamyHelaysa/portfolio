import { describe, expect, it, vi } from "vitest";
import { runFfmpeg } from "../../../scripts/fav/ffmpeg.ts";

const { execFileMock } = vi.hoisted(() => ({ execFileMock: vi.fn() }));

vi.mock("node:child_process", () => ({
  default: { execFile: execFileMock },
  execFile: execFileMock,
}));

describe("Favorite ffmpeg diagnostics", () => {
  it.each([
    { args: ["-version"] },
    { args: ["-i", "broken.png", "output.jpg"] },
  ])("prints stderr and preserves the failure for $args", async ({ args }) => {
    const failure = Object.assign(new Error("Command failed: ffmpeg"), {
      stderr: "Invalid data found when processing input",
    });
    execFileMock.mockImplementation((_file, _args, callback) => callback(failure));
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(runFfmpeg(args)).rejects.toBe(failure);
    expect(stderr).toHaveBeenCalledWith("ffmpeg error:", failure.stderr);
  });

  it("prints the process error when ffmpeg provides no stderr", async () => {
    const failure = new Error("spawn ffmpeg ENOENT");
    execFileMock.mockImplementation((_file, _args, callback) => callback(failure));
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(runFfmpeg(["-version"])).rejects.toBe(failure);
    expect(stderr).toHaveBeenCalledWith("ffmpeg error:", failure);
  });

  it("skips diagnostics when the caller reports the failure itself", async () => {
    const failure = new Error("spawn ffmpeg ENOENT");
    execFileMock.mockImplementation((_file, _args, callback) => callback(failure));
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      runFfmpeg(["-version"], { silent: true }),
    ).rejects.toBe(failure);
    expect(stderr).not.toHaveBeenCalled();
  });

  it("keeps successful ffmpeg runs quiet", async () => {
    execFileMock.mockImplementation((_file, _args, callback) => callback(null));
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(runFfmpeg(["-version"])).resolves.toBeUndefined();
    expect(stderr).not.toHaveBeenCalled();
  });
});
