import { describe, expect, it } from "vitest";
import { NAME_MAX, cleanPlayerName, nameKey } from "./player-name";

describe("cleanPlayerName", () => {
  it("accepts ordinary and international names", () => {
    for (const ok of ["Bramble", "Dr. Thistle", "O'Brien", "Zoë", "Ana-María", "山田 太郎", "Fox_42"]) {
      expect(cleanPlayerName(ok).error).toBeUndefined();
    }
  });

  it("tidies whitespace and invisible characters", () => {
    const zeroWidth = String.fromCodePoint(0x200b);
    const newline = String.fromCodePoint(10);
    expect(cleanPlayerName("  Bram   ble ").name).toBe("Bram ble");
    expect(cleanPlayerName(`Bram${zeroWidth}ble`).name).toBe("Bramble");
    expect(cleanPlayerName(`two${newline}lines`).name).toBe("two lines");
  });

  it("rejects empty and over-long names", () => {
    expect(cleanPlayerName("   ").error).toMatch(/Choose a player name/);
    expect(cleanPlayerName("x".repeat(NAME_MAX + 1)).error).toMatch(/under 40/);
  });

  it("rejects markup, SQL punctuation and control characters", () => {
    const nul = String.fromCodePoint(0);
    const attacks = [
      "<script>alert(1)</script>",
      "Robert'); DROP TABLE players;--",
      '" OR "1"="1',
      "name; select * from admins",
      `a${nul}b`,
      "back" + String.fromCodePoint(92) + "slash",
      "{{template}}",
      "`ticks`",
    ];
    for (const attack of attacks) {
      expect(cleanPlayerName(attack).error, attack).toBeTruthy();
    }
  });

  it("needs at least one letter or number", () => {
    expect(cleanPlayerName("...").error).toMatch(/at least one letter/);
  });
});

describe("nameKey", () => {
  it("ignores case and accents so look-alikes collide", () => {
    expect(nameKey("Zoë")).toBe(nameKey("ZOE"));
  });
});
