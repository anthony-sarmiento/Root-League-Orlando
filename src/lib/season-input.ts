import type { SeasonRow } from "./seasons";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Checks a new or edited season against the existing ones. Seasons can't overlap, because a
 * game would then count towards two leaderboards. Returns user-facing problems.
 */
export function validateSeasonInput(candidate: SeasonRow, existing: SeasonRow[]): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(candidate.number) || candidate.number < 1) errors.push("Season number must be 1 or higher.");
  if (!isRealDate(candidate.startsOn)) errors.push("Pick a valid start date.");
  if (!isRealDate(candidate.endsOn)) errors.push("Pick a valid end date.");
  if (errors.length) return errors;

  if (candidate.endsOn < candidate.startsOn) errors.push("A season can't end before it starts.");

  for (const other of existing) {
    if (other.number === candidate.number) continue;
    const overlaps = candidate.startsOn <= other.endsOn && candidate.endsOn >= other.startsOn;
    if (overlaps) errors.push(`These dates overlap Season ${other.number} (${other.startsOn} to ${other.endsOn}).`);
  }
  return errors;
}
