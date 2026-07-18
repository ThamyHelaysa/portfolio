import { describe, expect, it, vi } from "vitest";

import tocPlugin from "../../../../src/_config/toc/index.js";

describe("tocPlugin", () => {
  it("registers data and markup filters with shared plugin options", () => {
    const filters = new Map<string, (content: string, options?: { minHeadings?: number }) => unknown>();
    const addFilter = vi.fn((name: string, filter: (content: string) => unknown) => {
      filters.set(name, filter);
    });

    tocPlugin({ addFilter }, { minHeadings: 2 });

    const html = '<h2 id="one">One</h2><h2 id="two">Two</h2>';
    expect(filters.get("tocItems")?.(html)).toHaveLength(2);
    expect(filters.get("toc")?.(html)).toContain("<nav");
    expect(filters.get("toc")?.(html, { minHeadings: 3 })).toBe("");
  });

  it("treats a bare number call option as the minHeadings override", () => {
    const filters = registerFilters();

    const html = '<h2 id="one">One</h2><h2 id="two">Two</h2><h2 id="three">Three</h2>';
    expect(filters.get("toc")?.(html, 5)).toBe("");
    expect(filters.get("toc")?.(html, 2)).toContain("<nav");
  });

  it("counts every Heading-tree node with the tocCount filter", () => {
    const filters = registerFilters();

    const html = '<h2 id="one">One</h2><h3 id="one-a">One A</h3><h2 id="two">Two</h2>';
    const items = filters.get("tocItems")?.(html);
    expect(filters.get("tocCount")?.(items)).toBe(3);
    expect(filters.get("tocCount")?.(undefined)).toBe(0);
  });

  it("publishes its resolved options as tocConfig global data", () => {
    const globals = new Map<string, unknown>();
    tocPlugin(
      {
        addFilter: () => {},
        addGlobalData: (name: string, value: unknown) => globals.set(name, value),
      },
      { minHeadings: 4 }
    );

    expect(globals.get("tocConfig")).toMatchObject({
      tags: ["h2", "h3", "h4"],
      ignore: [".header-anchor"],
      minHeadings: 4,
    });
  });

  it("registers without addGlobalData support", () => {
    expect(() => tocPlugin({ addFilter: () => {} })).not.toThrow();
  });

  it("tolerates null call options instead of throwing", () => {
    const filters = registerFilters({ minHeadings: 2 });

    const html = '<h2 id="one">One</h2><h2 id="two">Two</h2>';
    expect(filters.get("tocItems")?.(html, null)).toHaveLength(2);
    expect(filters.get("toc")?.(html, null)).toContain("<nav");
  });
});

function registerFilters(pluginOptions?: { minHeadings?: number }) {
  const filters = new Map<string, (content?: unknown, options?: unknown) => unknown>();
  tocPlugin(
    {
      addFilter: (name, filter) => {
        filters.set(name, filter as (content?: unknown, options?: unknown) => unknown);
      },
    },
    pluginOptions
  );
  return filters;
}
