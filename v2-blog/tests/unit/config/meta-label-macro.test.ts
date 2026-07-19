import path from "node:path";

// @ts-expect-error nunjucks ships no types; runtime-only use in this test.
import nunjucks from "nunjucks";
import { describe, expect, it } from "vitest";

const includesDir = path.resolve(process.cwd(), "src/_includes");

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(includesDir), {
  autoescape: false,
});

const template = `
  {%- from "macros/meta-label.njk" import metaLabel -%}
  {%- call metaLabel("dt", "shrink-0 text-xs") -%}Desc&nbsp;/{%- endcall -%}
`;

describe("metadata label macro", () => {
  it("renders caller content with its semantic tag and shared styling", () => {
    expect(env.renderString(template)).toBe(
      '<dt class="shrink-0 text-xs text-accent/60 uppercase tracking-widest">Desc&nbsp;/</dt>',
    );
  });
});
