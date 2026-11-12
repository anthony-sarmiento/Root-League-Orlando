import type { GameInput } from "./game-input";
import { PLACEMENTS, type FactionId } from "./league";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/** Reads a table from a game form: 3 or 4 seats listed in finishing order, plus its night, date and round. */
export function parseGameForm(formData: FormData): GameInput {
  const seats = text(formData, "tableSize") === "3" ? 3 : 4;
  return {
    playedOn: text(formData, "playedOn"),
    sessionId: text(formData, "sessionId") || null,
    round: Number(text(formData, "round") || 1),
    // Seat order is finishing order: seat 1 = 1st place, and so on.
    results: PLACEMENTS.slice(0, seats).map((placement, i) => ({
      playerId: text(formData, `player-${i}`),
      faction: text(formData, `faction-${i}`) as FactionId,
      placement,
    })),
  };
}

/** The shape the database functions take. */
export function toRpcResults(input: GameInput) {
  return input.results.map((r) => ({ player_id: r.playerId, faction: r.faction, placement: r.placement }));
}
