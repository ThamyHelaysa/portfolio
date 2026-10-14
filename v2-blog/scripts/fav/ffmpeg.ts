/* eslint-disable no-console -- CLI diagnostics. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface RunFfmpegOptions {
  /** Skips diagnostics when the caller reports the failure in its own words. */
  silent?: boolean;
}

/** Runs ffmpeg and prints its diagnostic output before propagating a failure. */
export async function runFfmpeg(
  args: string[],
  options: RunFfmpegOptions = {},
): Promise<void> {
  try {
    await execFileAsync("ffmpeg", args);
  } catch (error) {
    if (!options.silent) {
      const failure = error as Error & { stderr?: string };
      console.error("ffmpeg error:", failure.stderr || failure);
    }
    throw error;
  }
}
