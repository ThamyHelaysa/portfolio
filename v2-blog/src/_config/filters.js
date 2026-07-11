export default {
  formatYear: function () {
    return new Date().getFullYear();
  },

  formatDateFull: function (inputDate) {
    const date = new Date(inputDate);

    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();

    return `${month} ${day}, ${year}`;
  },

  // Numeric DD/MM/YYYY, used by the post meta header.
  // Date-only strings (YYYY-MM-DD) are read as calendar parts so the day
  // does not shift under the local timezone (new Date() would treat them as UTC).
  formatDateShort: function (inputDate) {
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(inputDate).trim());
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${day}/${month}/${year}`;
    }

    const date = new Date(inputDate);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  },

  // Estimated reading time in whole minutes at ~200 wpm.
  // Accepts rendered HTML (post content); strips tags before counting.
  readingTime: function (content) {
    const text = String(content || "").replace(/<[^>]*>/g, " ");
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  },

  // Segmented block meter: `value` filled cells out of `max`, clamped.
  // Filled = ▌, empty = ░. Used for mood level and reading-time length.
  meterBar: function (value, max = 5) {
    const total = Math.max(1, Math.floor(max));
    const filled = Math.min(total, Math.max(0, Math.round(Number(value) || 0)));
    return "▌".repeat(filled) + "░".repeat(total - filled);
  },

  // Reading-time length as meter cells (0..5): ~15 min = full bar.
  readingTimeMeter: function (minutes, max = 5) {
    const total = Math.max(1, Math.floor(max));
    const cells = Math.min(total, Math.round((Number(minutes) || 0) / 15 * total));
    return "▌".repeat(cells) + "░".repeat(total - cells);
  },
}