import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, mkdir, writeFile } = vi.hoisted(() => ({ get: vi.fn(), mkdir: vi.fn(), writeFile: vi.fn() }));
vi.mock("@netlify/blobs", () => ({ getStore: () => ({ get }) }));
// Never touch the real ./fonts (licensed files live there locally).
vi.mock("node:fs/promises", () => ({ default: { mkdir, writeFile }, mkdir, writeFile }));

import { FILES, onPreBuild } from "../../../plugins/fetch-fonts/index.js";

const run = () => {
  const failBuild = vi.fn();
  return onPreBuild({
    constants: { SITE_ID: "site", NETLIFY_API_TOKEN: "token" },
    utils: { build: { failBuild } },
  }).then(() => failBuild);
};

describe("fetch-fonts plugin", () => {
  beforeEach(() => vi.stubEnv("CONTEXT", "production"));

  it("skips outside production so previews use the fallback fonts", async () => {
    vi.stubEnv("CONTEXT", "deploy-preview");
    const failBuild = await run();
    expect(get).not.toHaveBeenCalled();
    expect(failBuild).not.toHaveBeenCalled();
  });

  it("writes every font file in production", async () => {
    get.mockResolvedValue(new ArrayBuffer(1));
    const failBuild = await run();
    expect(writeFile).toHaveBeenCalledTimes(FILES.length);
    expect(failBuild).not.toHaveBeenCalled();
  });

  it("fails the production build when a file is missing", async () => {
    get.mockResolvedValueOnce(new ArrayBuffer(1)).mockResolvedValueOnce(null);
    const failBuild = await run();
    expect(failBuild).toHaveBeenCalledOnce();
  });
});
