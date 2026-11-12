/**
 * League rules and shared types for Root League Orlando.
 * Tweak the numbers here — everything else (leaderboards, profiles) recomputes from them.
 */

// ---- LP rules -------------------------------------------------------------

/** Every game seats exactly this many players. */
export const PLAYERS_PER_GAME = 4;

export type Placement = 1 | 2 | 3 | 4;

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

export function lpForPlacement(placement: Placement): number {
  return LP_BY_PLACEMENT[placement];
}
