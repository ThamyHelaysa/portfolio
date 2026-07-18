
export default {
  blogSectionBlock: function (content, url, title, date, tags, index) {
    // The listing index, zero-padded (01, 02, …). Callers pass Nunjucks'
    // `loop.index`; it stays decorative, so it's aria-hidden.
    const ordinal = index ? String(index).padStart(2, "0") : "";
    return `
      <div class="group bg-background flex flex-col gap-2 py-1 px-3">
        <a href="${url}" class="shrink-0 flex flex-col md:flex-row items-end gap-2 md:gap-4">
          <div class="flex flex-col flex-2/3 grow-0 shrink gap-1 md:gap-0">
            <h3 class="flex items-baseline gap-3 text-xl tracking-wider md:text-2xl font-bold text-accent mb-2 leading-tight">
              ${ordinal ? `<span aria-hidden="true" class="w-5 shrink-0 text-xs font-mono tabular-nums text-accent/40 transition-colors group-hover:text-accent">${ordinal}</span>` : ""}
                ${title}
            </h3>
            <span class="font-mono text-xs ml-8">${content}</span>
          </div>
          <!-- Date rides the hover: hidden on desktop until the row is hovered
                or something inside it takes focus (keyboard users get it too).
                Opacity, not display, so the row never reflows — and touch
                screens, which have no hover, just show it. -->
          <p class="text-xs flex-auto text-right font-sans text-accent/60 uppercase tracking-widest transition-opacity duration-200 motion-reduce:transition-none md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            ${date}
          </p>
        </a>
      </div>
    `;
  },

  sectionBlock: function (content, title, subtitle) {
    return `
      <div class="bg-background flex flex-col md:flex-row gap-8 md:gap-24 py-12 md:py-12 px-6 md:px-8 border-t border-accent/10 first:border-t-0">
        <div class="md:w-1/3 shrink-0">
          <h2 class="text-2xl md:mb-2 md:text-3xl text-accent mb-2 leading-tight">
            ${title}
          </h2>
          ${subtitle ? `
            <p class="text-sm font-sans text-accent/60 uppercase tracking-widest mt-2">
              ${subtitle}
            </p>
          ` : ""}
        </div>
        <div class="md:w-2/3 leading-relaxed text-text-gray font-light text-lg">
          ${content}
        </div>
      </div>
    `;
  },

  videoContainer: function (content, desktopSrc, mobileSrc, props) {
    return `
    <figure class="video-wrapper">
      <video controls ${props ? props : ""}>
        <source src="/assets/videos/${mobileSrc || desktopSrc}" media="(max-width: 425px)" type="video/mp4">
        <source src="/assets/videos/${desktopSrc}" type="video/mp4">
      </video>
      <figcaption>${content}</figcaption>
    </figure>
  `;
  }
}
