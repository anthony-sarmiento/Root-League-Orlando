import { nameKey } from "./player-name";

export interface NameOption {
  id: string;
  name: string;
  /** Small extra text after the name, for example "(8 games)" or "(you)". */
  hint?: string;
  /** Shown but not selectable, for example a player already seated at this table. */
  disabled?: boolean;
}

/**
 * The names that match what someone typed, best matches first: names that start with it, then names where a word
 * starts with it, then names that merely contain it. Capitals and accents are ignored ("zoe" finds "Zoë").
 * An empty search lists everyone in the original order.
 */
export function searchNames<T extends NameOption>(options: T[], query: string): T[] {
  const q = nameKey(query.trim());
  if (!q) return options;

  const ranked: { option: T; rank: number }[] = [];
  for (const option of options) {
    const key = nameKey(option.name);
    let rank = -1;
    if (key.startsWith(q)) rank = 0;
    else if (key.split(/[\s.'’_-]+/).some((word) => word.startsWith(q))) rank = 1;
    else if (key.includes(q)) rank = 2;
    if (rank >= 0) ranked.push({ option, rank });
  }
  // Array.prototype.sort is stable, so equally good matches keep their original (alphabetical) order.
  return ranked.sort((a, b) => a.rank - b.rank).map((r) => r.option);
}
