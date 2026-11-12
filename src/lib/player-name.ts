export const NAME_MAX = 40;

/** A global RegExp matching any character in the given code point ranges (built from numbers, so nothing is hidden in the source). */
function charClass(ranges: [number, number][]): RegExp {
  const body = ranges
    .map(([lo, hi]) => (lo === hi ? String.fromCodePoint(lo) : `${String.fromCodePoint(lo)}-${String.fromCodePoint(hi)}`))
    .join("");
  return new RegExp(`[${body}]`, "g");
}

/** Zero-width spaces, directional overrides and the byte-order mark: text you can't see. */
export const INVISIBLE_CHARS = charClass([
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2064],
  [0xfeff, 0xfeff],
]);

/** Control characters other than tab, line feed and carriage return. */
export const CONTROL_CHARS = charClass([
  [0x00, 0x08],
  [0x0b, 0x0c],
  [0x0e, 0x1f],
  [0x7f, 0x7f],
]);

/**
 * Cleans and checks a player name. Every way a name can enter the league (sign-up, profile edits, the organizer's
 * add and rename) goes through this one function, so the rules can't drift apart.
 *
 * Names are limited to letters (any language), numbers, spaces and a few quiet marks. That keeps out markup,
 * quotes, SQL punctuation, look-alike control characters and invisible text, on top of the fact that the database
 * is only ever queried with bound parameters. The database enforces a second, looser version of the same rule.
 */
export function cleanPlayerName(raw: string): { name: string; error?: string } {
  // NFC so "é" typed two different ways is one name; drop invisible characters; collapse runs of whitespace.
  const name = raw
    .normalize("NFC")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!name) return { name, error: "Choose a player name." };
  if ([...name].length > NAME_MAX) return { name, error: `Keep your name under ${NAME_MAX} characters.` };
  if (!/^[\p{L}\p{M}\p{N} .'’_-]+$/u.test(name)) {
    return { name, error: "Names can use letters, numbers, spaces and . ' _ - only." };
  }
  if (!/[\p{L}\p{N}]/u.test(name)) return { name, error: "A name needs at least one letter or number." };
  return { name };
}

/** Case- and accent-insensitive form, for spotting two names that would look identical on the leaderboard. */
export function nameKey(name: string): string {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}
