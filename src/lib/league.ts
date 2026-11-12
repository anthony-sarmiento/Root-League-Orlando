/**
 * League rules and shared types for Root League Orlando.
 * Tweak the numbers here — everything else (leaderboards, profiles) recomputes from them.
 */

// ---- LP rules -------------------------------------------------------------

/** A full table seats this many players. */
export const PLAYERS_PER_GAME = 4;
/** Some tables play with one fewer. */
export const MIN_PLAYERS_PER_GAME = 3;
export const TABLE_SIZES = [3, 4] as const;
/** A night can run up to this many rounds (usually one or two). */
export const MAX_ROUNDS = 4;

export type Placement = 1 | 2 | 3 | 4;

/** League Points on a table of 3: the same points for 1st to 3rd, with no 4th place. */
export const LP_THREE_PLAYER: Record<1 | 2 | 3, number> = {
  1: 5,
  2: 3,
  3: 2,
};

/** League Points awarded by finishing position. */
export const LP_BY_PLACEMENT: Record<Placement, number> = {
  1: 5,
  2: 3,
  3: 2,
  4: 1,
};

export const PLACEMENTS: Placement[] = [1, 2, 3, 4];

/** A faction needs at least this many games before it can be a player's "best faction". */
export const MIN_GAMES_FOR_BEST_FACTION = 2;

// ---- Factions -------------------------------------------------------------

export type FactionId =
  | "marquise"
  | "eyrie"
  | "alliance"
  | "vagabond"
  | "riverfolk"
  | "lizards"
  | "corvids"
  | "duchy"
  | "keepers"
  | "hundreds"
  | "frogs"
  | "bats"
  | "knaves";

export interface Faction {
  id: FactionId;
  name: string;
  /** Badge colour (roughly each faction's board colour). */
  color: string;
  /** Fallback glyph, only used if an icon image fails to load. */
  emoji: string;
  /** Official faction icon (a small WebP under /public/factions). */
  icon: string;
  /** Tileable patterned background in the faction's colours, for card banners. */
  pattern: string;
}

const FACTION_DATA: Omit<Faction, "icon" | "pattern">[] = [
  { id: "marquise", name: "Marquise de Cat", color: "#d9762b", emoji: "🐱" },
  { id: "eyrie", name: "Eyrie Dynasties", color: "#3f6fa8", emoji: "🦅" },
  { id: "alliance", name: "Woodland Alliance", color: "#5f9a4a", emoji: "🌿" },
  { id: "vagabond", name: "Vagabond", color: "#8a8a8a", emoji: "🦝" },
  { id: "riverfolk", name: "Riverfolk Company", color: "#4fa3a5", emoji: "🦦" },
  { id: "lizards", name: "Lizard Cult", color: "#d9b53a", emoji: "🦎" },
  { id: "corvids", name: "Corvid Conspiracy", color: "#6a4c93", emoji: "🐦‍⬛" },
  { id: "duchy", name: "Underground Duchy", color: "#b0603f", emoji: "⛏️" },
  { id: "keepers", name: "Keepers in Iron", color: "#6f7f8f", emoji: "🦡" },
  { id: "hundreds", name: "Lord of the Hundreds", color: "#b5443a", emoji: "🐀" },
  // The Homeland Expansion.
  { id: "frogs", name: "Lilypad Diaspora", color: "#b4a22a", emoji: "🐸" },
  { id: "bats", name: "Twilight Council", color: "#a06236", emoji: "🦇" },
  { id: "knaves", name: "Knaves of the Deepwood", color: "#4a5a70", emoji: "🦨" },
];

// Icons and patterns are generated into /public by scripts/build-assets.mjs.
export const FACTIONS: Faction[] = FACTION_DATA.map((f) => ({
  ...f,
  icon: `/factions/${f.id}.webp`,
  pattern: `/patterns/${f.id}.webp`,
}));

const FACTION_INDEX = new Map(FACTIONS.map((f) => [f.id, f]));

export function getFaction(id: FactionId): Faction {
  const faction = FACTION_INDEX.get(id);
  if (!faction) throw new Error(`Unknown faction: ${id}`);
  return faction;
}

// ---- Core data types ------------------------------------------------------

/** Where the portrait is centred and how far in it is zoomed. x and y are 0-100 (percent of the portrait). */
export interface AvatarCrop {
  x: number;
  y: number;
  /** Percent: 100 is fitted, 300 is three times closer. */
  zoom: number;
}

export interface Player {
  id: string;
  name: string;
  /** Short self-written blurb shown on the public profile. */
  bio?: string;
  favoriteFaction?: FactionId;
  /** Avatar id from src/lib/avatars.generated.ts. */
  avatar?: string;
  /** Faction whose pattern is drawn behind the avatar. */
  avatarBg?: FactionId;
  /** How the character sits in the round picture. */
  avatarCrop?: AvatarCrop;
}

/** A player RSVP for a game night. */
export interface Signup {
  sessionId: string;
  playerId: string;
}

export interface GameResult {
  playerId: string;
  faction: FactionId;
  placement: Placement;
}

export interface Game {
  id: string;
  /** Which round of the night this table played in (1 or 2 usually). */
  round: number;
  /** ISO date (YYYY-MM-DD) the game was played. */
  playedOn: string;
  sessionId?: string;
  results: GameResult[];
}

export interface Session {
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: string;
  location: string;
}

/** League points for a finishing place, on a table of `tableSize` players. */
export function lpForPlacement(placement: Placement, tableSize: number = PLAYERS_PER_GAME): number {
  if (tableSize === 3) return LP_THREE_PLAYER[placement as 1 | 2 | 3] ?? 0;
  return LP_BY_PLACEMENT[placement];
}
