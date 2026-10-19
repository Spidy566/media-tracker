/**
 * Pure functions using local date arithmetic only.
 * Never parse "YYYY-MM-DD" with `new Date(string)` (it parses as UTC).
 */

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface MonthCell {
  date: Date;
  ymd: string;
  dayNumber: number;
  inMonth: boolean;
}

/**
 * Converts a local Date object to "YYYY-MM-DD" using local components.
 */
export function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses "YYYY-MM-DD" into a local Date object without UTC shift.
 */
export function parseYMD(str: string): Date {
  const [yearStr, monthStr, dayStr] = str.split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);
  return new Date(year, month - 1, day);
}

/**
 * Returns the first and last day of a month (YYYY-MM) as YYYY-MM-DD strings.
 */
export function monthRange(ym: string): { start: string; end: string } {
  const [yearStr, monthStr] = ym.split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const start = `${ym}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${ym}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

/**
 * Builds a Monday-first 6-row by 7-col grid (42 cells) for the given YYYY-MM.
 */
export function buildMonthGrid(ym: string): MonthCell[] {
  const [yearStr, monthStr] = ym.split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const targetMonthIndex = month - 1;

  const firstDate = parseYMD(`${ym}-01`);
  // Monday-first index: Mon=0, Tue=1, ..., Sun=6
  const dayOfWeek = (firstDate.getDay() + 6) % 7;

  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(year, targetMonthIndex, 1 - dayOfWeek + i);
    const inMonth = date.getMonth() === targetMonthIndex;
    cells.push({
      date,
      ymd: toYMD(date),
      dayNumber: date.getDate(),
      inMonth,
    });
  }

  return cells;
}

/**
 * Returns a human-friendly relative label compared to today's date.
 * E.g. "Today", "Tomorrow", "Yesterday", "in 12 days", "3 days ago", "in 2 months".
 */
export function relativeLabel(ymd: string, todayYmd: string): string {
  const target = parseYMD(ymd);
  const today = parseYMD(todayYmd);

  const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((utcTarget - utcToday) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";

  if (diffDays > 1 && diffDays < 30) {
    return `in ${diffDays} days`;
  }
  if (diffDays < -1 && diffDays > -30) {
    return `${Math.abs(diffDays)} days ago`;
  }

  const diffMonths =
    (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());

  if (diffDays >= 30) {
    const months = Math.max(1, diffMonths || Math.round(diffDays / 30));
    if (months < 12) {
      return months === 1 ? "in 1 month" : `in ${months} months`;
    }
    const years = Math.max(1, Math.round(months / 12));
    return years === 1 ? "in 1 year" : `in ${years} years`;
  }

  if (diffDays <= -30) {
    const months = Math.max(1, Math.abs(diffMonths) || Math.round(Math.abs(diffDays) / 30));
    if (months < 12) {
      return months === 1 ? "1 month ago" : `${months} months ago`;
    }
    const years = Math.max(1, Math.round(months / 12));
    return years === 1 ? "1 year ago" : `${years} years ago`;
  }

  return "";
}

/**
 * Formats YYYY-MM-DD into "Fri 23 Oct".
 */
export function formatDayHeading(ymd: string): string {
  const d = parseYMD(ymd);
  const weekday = WEEKDAYS_SHORT[d.getDay()];
  const day = d.getDate();
  const month = MONTHS_SHORT[d.getMonth()];
  return `${weekday} ${day} ${month}`;
}

/**
 * Formats YYYY-MM-DD into full day format, e.g. "Friday, 23 October 2026".
 */
export function formatFullDay(ymd: string): string {
  const d = parseYMD(ymd);
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    d.getDay()
  ];
  const day = d.getDate();
  const month = MONTHS_FULL[d.getMonth()];
  const year = d.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

/**
 * Formats YYYY-MM into "October 2026".
 */
export function formatMonthTitle(ym: string): string {
  const [yearStr, monthStr] = ym.split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  return `${MONTHS_FULL[month - 1]} ${year}`;
}

/**
 * Returns the previous and next month strings ("YYYY-MM").
 */
export function getAdjacentMonths(ym: string): { prev: string; next: string } {
  const [yearStr, monthStr] = ym.split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);

  const prevDate = new Date(year, month - 2, 1);
  const nextDate = new Date(year, month, 1);

  const prevY = prevDate.getFullYear();
  const prevM = String(prevDate.getMonth() + 1).padStart(2, "0");

  const nextY = nextDate.getFullYear();
  const nextM = String(nextDate.getMonth() + 1).padStart(2, "0");

  return {
    prev: `${prevY}-${prevM}`,
    next: `${nextY}-${nextM}`,
  };
}
