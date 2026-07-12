/**
 * Build conventions for eleventy.config.ts.
 *
 * Pure functions only — no fs access. The config reads the filesystem and
 * feeds file lists in, so both conventions stay unit-testable.
 */

/** Directories whose TypeScript is compiled to browser JS (bundled ESM). */
const TS_COMPILE_DIRS = ["src/components/", "src/_helpers/"];

/**
 * Known non-browser TypeScript that the build must skip. Path prefixes,
 * relative to the project root (no leading "./").
 */
const TS_IGNORED_PREFIXES = [
  "src/@types/", // ambient type declarations, never shipped
  "src/_config/", // node-side build config (this module included), never shipped
];

/**
 * Stylesheets in src/assets/styles/ that are @import-only partials — they are
 * inlined into the sheets that import them and must not become standalone
 * outputs in dist/assets/css/.
 */
const CSS_PARTIALS = new Set(["config-theme.css", "shadow-config.css"]);

function normalize(inputPath: string): string {
  return inputPath.replace(/\\/g, "/").replace(/^\.\//, "");
}

/**
 * Decide what the build does with a `.ts` file Eleventy picked up.
 *
 * - under src/components/ or src/_helpers/ → "compile" (esbuild → browser JS)
 * - declaration files (.d.ts) or paths on the ignore list → "ignore"
 * - anything else → build error. No silent skips: move the file under
 *   src/components/ or src/_helpers/, or add it to the ignore list here.
 */
export function classifyTsInput(inputPath: string): "compile" | "ignore" {
  const normalized = normalize(inputPath);

  if (normalized.endsWith(".d.ts")) return "ignore";
  if (TS_IGNORED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return "ignore";
  }
  if (TS_COMPILE_DIRS.some((dir) => normalized.includes(dir))) {
    return "compile";
  }

  throw new Error(
    `[build] TypeScript file "${inputPath}" does not match the build convention. ` +
      `Move it under src/components/ or src/_helpers/ to compile it for the browser, ` +
      `or add it to the ignore list in src/_config/buildConventions.ts.`
  );
}

/**
 * Derive the Tailwind/PostCSS compilation targets from a directory listing:
 * every `*.css` in `styleDir` (except @import-only partials) compiles to
 * `outDir/<basename>`.
 */
export function cssTargets(
  styleDir: string,
  outDir: string,
  files: string[]
): { input: string; output: string }[] {
  return files
    .filter((file) => file.endsWith(".css") && !CSS_PARTIALS.has(file))
    .sort()
    .map((file) => ({
      input: `${styleDir}/${file}`,
      output: `${outDir}/${file}`,
    }));
}
