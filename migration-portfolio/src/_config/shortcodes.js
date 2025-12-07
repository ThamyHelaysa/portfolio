
export default {
  blogSectionBlock: function (content, url, title, date, tags) {
    return `
      <div class="flex flex-col md:flex-row gap-8 md:gap-24 py-12 md:py-16 border-t border-accent-red/10 first:border-t-0">
        <div class="md:w-1/3 shrink-0">
          <h3 class="text-2xl md:text-3xl font-serif text-accent-red mb-2 leading-tight">
            <a href="${url}">
              ${title}
            </a>
          </h3>
            <p class="text-sm font-sans text-accent-red/60 uppercase tracking-widest mt-2">
              ${date}
            </p>
        </div>
        <div class="md:w-2/3 leading-relaxed text-text-gray font-light text-lg">
          <div>${content}</div>
          <div class="flex flex-wrap gap-2 mt-6">
            ${tags ? tags.map((tag) => (
              `
              <span
                class="text-xs border border-accent-red/30 text-accent-red/80 px-2 py-1 rounded-full uppercase tracking-wider"
              >
                ${tag}
              </span>
              `
            )).join("") : ""}
          </div>
        </div>
      </div>
    `;
  },

  sectionBlock: function (content, title, subtitle) {
    return `
      <div class="flex flex-col md:flex-row gap-8 md:gap-24 py-12 md:py-16 border-t border-accent-red/10 first:border-t-0">
        <div class="md:w-1/3 shrink-0">
          <h3 class="text-2xl md:text-3xl font-serif text-accent-red mb-2 leading-tight">
            ${title}
          </h3>
          ${subtitle ? `
            <p class="text-sm font-sans text-accent-red/60 uppercase tracking-widest mt-2">
              ${subtitle}
            </p>
          ` : ""}
        </div>
        <div class="md:w-2/3 leading-relaxed text-text-gray font-light text-lg">
          ${content}
        </div>
      </div>
    `;
  }
}
