/**
 * Seasons are an explicit list with their own start and end dates (they aren't all the
 * same length). Real seasons live in the database `seasons` table and are managed by
 * organizers; DEFAULT_SEASONS is the fallback used by the sample data and the unit tests.
 */

const LEAGUE_TIME_ZONE = "America/New_York";

export interface SeasonRow {
  number: number;
  startsOn: string; // YYYY-MM-DD
  endsOn: string; // YYYY-MM-DD (inclusive)
}

export interface Season extends SeasonRow {
  label: string; // "Season 2 · Nov 1 – Dec 20, 2026"
}

export type SeasonPhase = "upcoming" | "live" | "finished";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(iso: string, withYear: boolean): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}${withYear ? `, ${y}` : ""}`;
}

export function makeSeason(row: SeasonRow): Season {
  const sameYear = row.startsOn.slice(0, 4) === row.endsOn.slice(0, 4);
  const range = sameYear
    ? `${shortDate(row.startsOn, false)} – ${shortDate(row.endsOn, true)}`
    : `${shortDate(row.startsOn, true)} – ${shortDate(row.endsOn, true)}`;
  return { ...row, label: `Season ${row.number} · ${range}` };
}

/** Season 1: Jun 7 – Sep 7, 2026. Season 2: Nov 1 – Dec 20, 2026. */
export const DEFAULT_SEASONS: Season[] = [
  makeSeason({ number: 1, startsOn: "2026-06-07", endsOn: "2026-09-07" }),
  makeSeason({ number: 2, startsOn: "2026-11-01", endsOn: "2026-12-20" }),
];

/** Newest season first. */
export function sortSeasons(seasons: Season[]): Season[] {
  return [...seasons].sort((a, b) => b.number - a.number);
}

/** Today's date in Orlando, as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LEAGUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isInSeason(iso: string, season: Season): boolean {
  return iso >= season.startsOn && iso <= season.endsOn;
}

/** The season a date falls in, or undefined for dates between seasons. */
export function seasonForDate(seasons: Season[], iso: string): Season | undefined {
  return seasons.find((s) => isInSeason(iso, s));
}

export function seasonByNumber(seasons: Season[], number: number): Season | undefined {
  return seasons.find((s) => s.number === number);
}

export function seasonPhase(season: Season, today: string): SeasonPhase {
  if (today < season.startsOn) return "upcoming";
  if (today > season.endsOn) return "finished";
  return "live";
}

/**
 * The season to feature by default: the one running now; otherwise the next one that
 * hasn't started; otherwise the most recent finished one.
 */
export function featuredSeason(seasons: Season[], today: string): Season | undefined {
  const byStart = [...seasons].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  return (
    byStart.find((s) => seasonPhase(s, today) === "live") ??
    byStart.find((s) => seasonPhase(s, today) === "upcoming") ??
    byStart[byStart.length - 1]
  );
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}
