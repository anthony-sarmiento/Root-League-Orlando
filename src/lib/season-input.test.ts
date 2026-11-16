import { describe, expect, it } from "vitest";
import { MAX_PRIZE_OVERRIDE, parsePrizeOverride } from "./season-input";

describe("parsePrizeOverride", () => {
  it("treats an empty box as 'count it from the games'", () => {
    expect(parsePrizeOverride("")).toEqual({ value: null });
    expect(parsePrizeOverride("   ")).toEqual({ value: null });
  });

  it("reads whole dollars, tolerating a $ sign and commas", () => {
    expect(parsePrizeOverride("85")).toEqual({ value: 85 });
    expect(parsePrizeOverride(" $1,250 ")).toEqual({ value: 1250 });
    expect(parsePrizeOverride("0")).toEqual({ value: 0 });
  });

  it("refuses anything else", () => {
    for (const bad of ["12.50", "-5", "abc", "5e3", "1 000", "$$5"]) {
      expect(parsePrizeOverride(bad).error, bad).toBeTruthy();
    }
    expect(parsePrizeOverride(String(MAX_PRIZE_OVERRIDE + 1)).error).toBeTruthy();
    expect(parsePrizeOverride(String(MAX_PRIZE_OVERRIDE)).value).toBe(MAX_PRIZE_OVERRIDE);
  });
});
