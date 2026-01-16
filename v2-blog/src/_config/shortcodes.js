
export default {
  blogSectionBlock: function (content, url, title, date, tags) {
    return `
      <div class="bg-background flex flex-col md:flex-row gap-8 md:gap-24 py-12 md:py-12 px-6 md:px-8 border-y border-accent/10 ">
        <div class="md:w-1/3 shrink-0">
          <h3 class="text-2xl md:mb-2! md:text-3xl text-accent mb-2 leading-tight">
            <a href="${url}">
              ${title}
            </a>
          </h3>
            <p class="text-sm! font-sans text-accent/60 uppercase tracking-widest mt-2">
              ${date}
            </p>
        </div>
        <div class="md:w-2/3 leading-relaxed text-text-gray font-light text-lg">
          <div class="">${content}</div>
          <div class="flex flex-wrap gap-2 mt-6">
            ${tags ? tags.map((tag) => (
              `<span
                class="font-mono leading-4 text-xs border border-accent/30 text-accent/80 px-2 py-1 rounded-full uppercase tracking-wider">
                ${tag}
              </span>
              `)).join("") : ""}
          </div>
        </div>
      </div>
    `;
  },

  sectionBlock: function (content, title, subtitle) {
    return `
      <div class="bg-background flex flex-col md:flex-row gap-8 md:gap-24 py-12 md:py-12 px-6 md:px-8 border-t border-accent/10 first:border-t-0">
        <div class="md:w-1/3 shrink-0">
          <h2 class="text-2xl md:mb-2! md:text-3xl text-accent mb-2 leading-tight">
            ${title}
          </h2>
          ${subtitle ? `
            <p class="text-sm! font-sans text-accent/60 uppercase tracking-widest mt-2">
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
