/**
 * Seasons last two calendar months. Season 1 starts on SEASON_ONE_START;
 * every later season follows back-to-back (Sep–Oct, Nov–Dec, Jan–Feb, ...).
 */

/** First month of Season 1 (month is 1–12). Change this to match when your league really began. */
export const SEASON_ONE_START = { year: 2026, month: 9 };

const LEAGUE_TIME_ZONE = "America/New_York";

export interface Season {
  number: number;
  startsOn: string; // YYYY-MM-DD
  endsOn: string; // YYYY-MM-DD (inclusive)
  label: string; // "Season 2 · Nov–Dec 2026"
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const monthIndex = (year: number, month: number) => year * 12 + (month - 1);
const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in Orlando, as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LEAGUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function seasonNumberForDate(iso: string): number {
  const [year, month] = iso.split("-").map(Number);
  const offset = monthIndex(year, month) - monthIndex(SEASON_ONE_START.year, SEASON_ONE_START.month);
  return Math.floor(offset / 2) + 1;
}

export function seasonByNumber(number: number): Season {
  const startIdx = monthIndex(SEASON_ONE_START.year, SEASON_ONE_START.month) + (number - 1) * 2;
  const startYear = Math.floor(startIdx / 12);
  const startMonth = (startIdx % 12) + 1;
  const endIdx = startIdx + 1;
  const endYear = Math.floor(endIdx / 12);
  const endMonth = (endIdx % 12) + 1;
  const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();

  const range =
    startYear === endYear
      ? `${MONTHS[startMonth - 1]}–${MONTHS[endMonth - 1]} ${startYear}`
      : `${MONTHS[startMonth - 1]} ${startYear}–${MONTHS[endMonth - 1]} ${endYear}`;

  return {
    number,
    startsOn: `${startYear}-${pad(startMonth)}-01`,
    endsOn: `${endYear}-${pad(endMonth)}-${pad(lastDay)}`,
    label: `Season ${number} · ${range}`,
  };
}

export function seasonForDate(iso: string): Season {
  return seasonByNumber(seasonNumberForDate(iso));
}

export function currentSeason(today: string = todayISO()): Season {
  return seasonForDate(today);
}

/** Every season from Season 1 through the current one, newest first. */
export function allSeasonsThrough(today: string = todayISO()): Season[] {
  const latest = seasonNumberForDate(today);
  const seasons: Season[] = [];
  for (let n = latest; n >= 1; n--) seasons.push(seasonByNumber(n));
  return seasons;
}

export function isInSeason(iso: string, season: Season): boolean {
  return iso >= season.startsOn && iso <= season.endsOn;
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}
