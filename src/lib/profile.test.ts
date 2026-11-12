import { describe, expect, it } from "vitest";
import { AVATARS } from "./avatars.generated";
import { DEFAULT_CROP, cropFrom, validateProfile } from "./profile";
import { validateSeasonInput } from "./season-input";

const base = { name: "Bramble", bio: "", favoriteFaction: "", avatar: "", avatarBg: "", avatarX: "", avatarY: "", avatarZoom: "" };

describe("validateProfile", () => {
  it("accepts a minimal profile and trims whitespace", () => {
    const { clean, errors } = validateProfile({ ...base, name: "  Bramble   the  Bold " });
    expect(errors).toEqual([]);
    expect(clean.name).toBe("Bramble the Bold");
  });

  it("requires a name and caps its length", () => {
    expect(validateProfile({ ...base, name: "   " }).errors).toContain("Choose a player name.");
    expect(validateProfile({ ...base, name: "x".repeat(41) }).errors[0]).toMatch(/under 40/);
  });

  it("caps the bio at 280 characters", () => {
    expect(validateProfile({ ...base, bio: "x".repeat(281) }).errors[0]).toMatch(/under 280/);
    expect(validateProfile({ ...base, bio: "x".repeat(280) }).errors).toEqual([]);
  });

  it("only allows real factions and avatars", () => {
    expect(validateProfile({ ...base, favoriteFaction: "eyrie", avatar: AVATARS[0].id }).errors).toEqual([]);
    expect(validateProfile({ ...base, favoriteFaction: "dragons" }).errors).toContain("Pick a faction from the list.");
    expect(validateProfile({ ...base, avatar: "../../etc/passwd" }).errors).toContain("Pick an avatar from the list.");
  });

  it("only allows real factions as an avatar background", () => {
    expect(validateProfile({ ...base, avatarBg: "frogs" }).errors).toEqual([]);
    expect(validateProfile({ ...base, avatarBg: "dragons" }).errors).toContain("Pick a background from the list.");
  });

  it("accepts a moved portrait and rejects impossible positions", () => {
    expect(validateProfile({ ...base, avatarX: "40", avatarY: "20", avatarZoom: "220" }).errors).toEqual([]);
    expect(validateProfile({ ...base, avatarX: "140" }).errors.length).toBe(1);
    expect(validateProfile({ ...base, avatarZoom: "50" }).errors.length).toBe(1);
    expect(validateProfile({ ...base, avatarY: "abc" }).errors.length).toBe(1);
  });

  it("builds a crop from database values", () => {
    expect(cropFrom(null, null, null)).toBeUndefined();
    expect(cropFrom(10, null, 999)).toEqual({ x: 10, y: DEFAULT_CROP.y, zoom: 300 });
  });

  it("ships a healthy avatar set with unique ids", () => {
    expect(AVATARS.length).toBeGreaterThan(50);
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(AVATARS.length);
  });
});

describe("validateSeasonInput", () => {
  const existing = [
    { number: 1, startsOn: "2026-06-07", endsOn: "2026-09-07" },
    { number: 2, startsOn: "2026-11-01", endsOn: "2026-12-20" },
  ];

  it("accepts a season in a gap", () => {
    expect(validateSeasonInput({ number: 3, startsOn: "2027-01-10", endsOn: "2027-03-01" }, existing)).toEqual([]);
  });

  it("rejects overlaps, including a single shared day", () => {
    const errs = validateSeasonInput({ number: 3, startsOn: "2026-12-20", endsOn: "2027-02-01" }, existing);
    expect(errs[0]).toMatch(/overlap Season 2/);
  });

  it("allows editing a season without clashing with itself", () => {
    expect(validateSeasonInput({ number: 2, startsOn: "2026-11-01", endsOn: "2026-12-31" }, existing)).toEqual([]);
  });

  it("rejects backwards or invalid dates", () => {
    expect(validateSeasonInput({ number: 3, startsOn: "2027-02-01", endsOn: "2027-01-01" }, existing)).toContain(
      "A season can't end before it starts.",
    );
    expect(validateSeasonInput({ number: 3, startsOn: "2027-02-30", endsOn: "2027-03-01" }, existing)).toContain(
      "Pick a valid start date.",
    );
  });
});
