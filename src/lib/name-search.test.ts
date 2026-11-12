import { describe, expect, it } from "vitest";
import { searchNames, type NameOption } from "./name-search";

const options: NameOption[] = ["Bramble", "Thistle", "Zoë Ana-María", "Mossy", "Dr. Bram", "Rowan Bramwell"].map((name, i) => ({
  id: String(i),
  name,
}));

describe("searchNames", () => {
  it("lists everyone, in order, when nothing is typed", () => {
    expect(searchNames(options, "").map((o) => o.name)).toEqual(options.map((o) => o.name));
    expect(searchNames(options, "   ").length).toBe(options.length);
  });

  it("matches the start of a name before the middle of one", () => {
    expect(searchNames(options, "bram").map((o) => o.name)).toEqual(["Bramble", "Dr. Bram", "Rowan Bramwell"]);
  });

  it("finds a word inside a name", () => {
    expect(searchNames(options, "ana").map((o) => o.name)).toEqual(["Zoë Ana-María"]);
  });

  it("ignores capitals and accents", () => {
    expect(searchNames(options, "ZOE").map((o) => o.name)).toEqual(["Zoë Ana-María"]);
    expect(searchNames(options, "maria").map((o) => o.name)).toEqual(["Zoë Ana-María"]);
  });

  it("finds names that merely contain the text, after better matches", () => {
    expect(searchNames(options, "ssy").map((o) => o.name)).toEqual(["Mossy"]);
    expect(searchNames(options, "ramb")[0].name).toBe("Bramble");
  });

  it("returns nothing when no name matches", () => {
    expect(searchNames(options, "qqq")).toEqual([]);
  });

  it("keeps hints and disabled flags on the results", () => {
    const withFlags: NameOption[] = [{ id: "1", name: "Fennel", hint: "(you)", disabled: true }];
    expect(searchNames(withFlags, "fen")[0]).toEqual(withFlags[0]);
  });
});
