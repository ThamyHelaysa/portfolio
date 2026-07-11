export interface DateParts {
  day: number;
  month: number;
  year: number;
}

// Parses the site's display format (DD/MM/YYYY) into calendar parts.
// String-based on purpose: no Date construction, so the parts can never
// shift under the user's timezone (mirrors the formatDateShort guard).
export function parseDisplayDate(input: string): DateParts | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(input ?? "").trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  return { day, month, year };
}

// Today's calendar parts in the user's local timezone — the local getters
// already answer in the viewer's zone, which is exactly what the odometer
// needs as its starting value.
export function todayParts(now: Date = new Date()): DateParts {
  return {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}
