import { describe, expect, it } from "vitest";
import { validateGameInput, type GameInput } from "./game-input";

const valid: GameInput = {
  playedOn: "2026-11-12",
  sessionId: null,
  results: [
    { playerId: "a", faction: "marquise", placement: 1 },
    { playerId: "b", faction: "eyrie", placement: 2 },
    { playerId: "c", faction: "alliance", placement: 3 },
    { playerId: "d", faction: "vagabond", placement: 4 },
  ],
};

describe("validateGameInput", () => {
  it("accepts a well-formed game", () => {
    expect(validateGameInput(valid)).toEqual([]);
  });

  it("rejects impossible dates", () => {
    expect(validateGameInput({ ...valid, playedOn: "2026-02-31" })).toContain("Pick a valid date.");
    expect(validateGameInput({ ...valid, playedOn: "" })).toContain("Pick a valid date.");
  });

  it("requires exactly four players", () => {
    const three = { ...valid, results: valid.results.slice(0, 3) };
    expect(validateGameInput(three)[0]).toMatch(/exactly 4 players/);
  });

  it("rejects a player seated twice", () => {
    const dup = { ...valid, results: valid.results.map((r, i) => (i === 1 ? { ...r, playerId: "a" } : r)) };
    expect(validateGameInput(dup)).toContain("A player can only sit once per game.");
  });

  it("rejects a faction played twice", () => {
    const dup = { ...valid, results: valid.results.map((r, i) => (i === 1 ? { ...r, faction: "marquise" as const } : r)) };
    expect(validateGameInput(dup)).toContain("Each faction can only be played once per game.");
  });

  it("rejects missing seats", () => {
    const blank = { ...valid, results: valid.results.map((r, i) => (i === 0 ? { ...r, playerId: "" } : r)) };
    expect(validateGameInput(blank)).toContain("Choose a player for every seat.");
  });

  it("rejects players who aren't in the league", () => {
    expect(validateGameInput(valid, new Set(["a", "b", "c"]))).toContain("One of those players isn't in the league.");
  });

  it("rejects repeated finishing places", () => {
    const bad = { ...valid, results: valid.results.map((r) => ({ ...r, placement: 1 as const })) };
    expect(validateGameInput(bad)).toContain("Finishing places must be 1st through 4th, once each.");
  });
});
