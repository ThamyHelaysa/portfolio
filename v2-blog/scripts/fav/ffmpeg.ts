/* eslint-disable no-console -- CLI diagnostics. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Runs ffmpeg and prints its diagnostic output before propagating a failure. */
export async function runFfmpeg(args: string[]): Promise<void> {
  try {
    await execFileAsync("ffmpeg", args);
  } catch (error) {
    const failure = error as Error & { stderr?: string };
    console.error("ffmpeg error:", failure.stderr || failure);
    throw error;
  }
}
