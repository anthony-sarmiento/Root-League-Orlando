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
  | "hundreds";

export interface Faction {
  id: FactionId;
  name: string;
  /** Badge colour (roughly each faction's board colour). */
  color: string;
  /** Placeholder glyph until the official icons are dropped in. */
  emoji: string;
  /**
   * Optional path to the official icon under /public, e.g. "/factions/marquise.png".
   * When set, it's used instead of the emoji.
   */
  icon?: string;
}

export const FACTIONS: Faction[] = [
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
];

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
