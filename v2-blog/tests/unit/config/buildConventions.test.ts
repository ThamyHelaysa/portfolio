import { describe, expect, it } from "vitest";

import { classifyTsInput, cssTargets } from "../../../src/_config/buildConventions.js";

describe("classifyTsInput", () => {
  it("compiles TypeScript under src/components/", () => {
    expect(classifyTsInput("./src/components/theme-toggle.ts")).toBe("compile");
  });

  it("compiles TypeScript under src/_helpers/", () => {
    expect(classifyTsInput("./src/_helpers/theme.ts")).toBe("compile");
  });

  it("compiles nested TypeScript under src/_helpers/", () => {
    expect(classifyTsInput("./src/_helpers/terminal/core.ts")).toBe("compile");
  });

  it("ignores declaration files", () => {
    expect(classifyTsInput("./src/@types/eleventy-img.d.ts")).toBe("ignore");
  });

  it("ignores paths on the explicit ignore list", () => {
    expect(classifyTsInput("./src/@types/some-module.ts")).toBe("ignore");
  });

  it("ignores node-side config modules under src/_config/", () => {
    expect(classifyTsInput("./src/_config/buildConventions.ts")).toBe("ignore");
  });

  it("throws on TypeScript outside the convention, naming the file", () => {
    expect(() => classifyTsInput("./src/stray.ts")).toThrowError(
      /src\/stray\.ts/
    );
  });

  it("states the convention in the error message", () => {
    expect(() => classifyTsInput("./src/pages/oops.ts")).toThrowError(
      /src\/components|src\/_helpers/
    );
  });
});

describe("cssTargets", () => {
  const styleDir = "./src/assets/styles";
  const outDir = "./dist/assets/css";

  it("maps every stylesheet to an output with the same basename", () => {
    const targets = cssTargets(styleDir, outDir, ["global.css", "shadow.css"]);
    expect(targets).toEqual([
      {
        input: "./src/assets/styles/global.css",
        output: "./dist/assets/css/global.css",
      },
      {
        input: "./src/assets/styles/shadow.css",
        output: "./dist/assets/css/shadow.css",
      },
    ]);
  });

  it("includes the deferred books stylesheet like any other target", () => {
    const targets = cssTargets(styleDir, outDir, ["books-terminal-deferred.css"]);
    expect(targets).toEqual([
      {
        input: "./src/assets/styles/books-terminal-deferred.css",
        output: "./dist/assets/css/books-terminal-deferred.css",
      },
    ]);
  });

  it("excludes @import-only partials from the target list", () => {
    const targets = cssTargets(styleDir, outDir, [
      "config-theme.css",
      "global.css",
      "shadow-config.css",
    ]);
    expect(targets.map((t) => t.input)).toEqual([
      "./src/assets/styles/global.css",
    ]);
  });

  it("skips non-CSS directory entries", () => {
    const targets = cssTargets(styleDir, outDir, [".DS_Store", "global.css"]);
    expect(targets.map((t) => t.input)).toEqual([
      "./src/assets/styles/global.css",
    ]);
  });

  it("returns targets in a stable sorted order", () => {
    const targets = cssTargets(styleDir, outDir, ["shadow.css", "global.css"]);
    expect(targets.map((t) => t.input)).toEqual([
      "./src/assets/styles/global.css",
      "./src/assets/styles/shadow.css",
    ]);
  });
});
