/** One linkable heading and its descendants in document order. */
export interface TocItem {
  id: string;
  text: string;
  level: number;
  children: TocItem[];
}

/** Content accepted by the default TOC renderer. */
export type TocInput = string | readonly TocItem[];

/** Public configuration shared by the TOC data and rendering filters. */
export interface TocOptions {
  tags: readonly string[];
  ignore: readonly string[];
  minHeadings: number;
}

/** Options accepted when configuring the plugin or overriding one filter call. */
export type TocOptionsInput = Partial<TocOptions>;

/** Minimal Eleventy surface used by the extractable plugin. */
export interface EleventyConfigLike {
  addFilter(name: string, filter: (content: never, options?: never) => unknown): void;
  addGlobalData?(name: string, value: unknown): void;
}
