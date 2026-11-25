import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const execFileAsync = promisify(execFile);

it("scaffolds a post using the canonical title slug", async () => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "new-post-"));
  const scriptPath = path.join(projectRoot, "scripts", "new-post.js");
  const configDirectory = path.join(projectRoot, "src", "_config");

  try {
    await mkdir(path.dirname(scriptPath), { recursive: true });
    await mkdir(configDirectory, { recursive: true });
    await copyFile("scripts/new-post.js", scriptPath);
    await copyFile(
      "src/_config/headingSlug.js",
      path.join(configDirectory, "headingSlug.js"),
    );
    await symlink(
      path.resolve("node_modules"),
      path.join(projectRoot, "node_modules"),
      "dir",
    );
    await writeFile(path.join(projectRoot, "package.json"), '{"type":"module"}');

    await execFileAsync(process.execPath, [scriptPath, "Café & Tea"], {
      cwd: projectRoot,
    });

    const post = await readFile(
      path.join(projectRoot, "src", "posts", "cafe-and-tea", "index.md"),
      "utf8",
    );
    expect(post).toContain('title: "Café & Tea"');
    expect(post).toContain("draft: true");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
