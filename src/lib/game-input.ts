import { FACTIONS, PLACEMENTS, PLAYERS_PER_GAME, type FactionId, type Placement } from "./league";

/** What an organizer submits when logging a game. Row order = finishing order. */
export interface GameInput {
  playedOn: string; // YYYY-MM-DD
  sessionId: string | null;
  results: { playerId: string; faction: FactionId; placement: Placement }[];
}

const FACTION_IDS = new Set<string>(FACTIONS.map((f) => f.id));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Checks a game before it is saved. Returns human-readable problems; empty means valid.
 * (The database enforces the same rules with unique constraints as a backstop.)
 */
export function validateGameInput(input: GameInput, knownPlayerIds?: Set<string>): string[] {
  const errors: string[] = [];

  if (!isRealDate(input.playedOn)) errors.push("Pick a valid date.");

  if (input.results.length !== PLAYERS_PER_GAME) {
    errors.push(`A game needs exactly ${PLAYERS_PER_GAME} players.`);
    return errors;
  }

  const players = input.results.map((r) => r.playerId);
  if (players.some((p) => !p)) errors.push("Choose a player for every seat.");
  else if (new Set(players).size !== players.length) errors.push("A player can only sit once per game.");
  else if (knownPlayerIds && players.some((p) => !knownPlayerIds.has(p))) {
    errors.push("One of those players isn't in the league.");
  }

  const factions = input.results.map((r) => r.faction);
  if (factions.some((f) => !FACTION_IDS.has(f))) errors.push("Choose a faction for every seat.");
  else if (new Set(factions).size !== factions.length) errors.push("Each faction can only be played once per game.");

  const placements = input.results.map((r) => r.placement).sort();
  if (PLACEMENTS.some((p, i) => placements[i] !== p)) errors.push("Finishing places must be 1st through 4th, once each.");

  return errors;
}
