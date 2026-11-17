import { beforeEach, describe, expect, it, vi } from "vitest";

// The organizer check and the database are replaced with fakes, so this exercises the real saveSeason logic.
const upserts: Record<string, unknown>[] = [];
let upsertError: { code?: string } | null = null;
let isAdmin = true;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin", () => ({
  requireAdminForAction: async () =>
    isAdmin
      ? {
          supabase: {
            from: () => ({
              select: async () => ({
                data: [
                  { number: 1, starts_on: "2026-06-07", ends_on: "2026-09-07" },
                  { number: 2, starts_on: "2026-11-01", ends_on: "2026-12-20" },
                ],
                error: null,
              }),
              upsert: async (row: Record<string, unknown>) => {
                // A database without migration 0012 refuses the unknown column.
                if (upsertError && "prize_override" in row) return { error: upsertError };
                upserts.push(row);
                return { error: null };
              },
            }),
          },
        }
      : null,
}));

import { saveSeason } from "./actions";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const season2 = { number: "2", startsOn: "2026-11-01", endsOn: "2026-12-20" };

beforeEach(() => {
  upserts.length = 0;
  upsertError = null;
  isAdmin = true;
});

describe("saveSeason prize pool", () => {
  it("saves an amount an organizer typed in", async () => {
    const result = await saveSeason({}, form({ ...season2, prizeOverride: "120" }));
    expect(result.ok).toBeTruthy();
    expect(upserts).toEqual([{ number: 2, starts_on: "2026-11-01", ends_on: "2026-12-20", prize_override: 120 }]);
  });

  it("accepts a dollar sign and commas, and an amount of zero", async () => {
    await saveSeason({}, form({ ...season2, prizeOverride: "$1,250" }));
    await saveSeason({}, form({ ...season2, prizeOverride: "0" }));
    expect(upserts.map((r) => r.prize_override)).toEqual([1250, 0]);
  });

  it("clears the amount (back to counting) when the box is emptied", async () => {
    const result = await saveSeason({}, form({ ...season2, prizeOverride: "" }));
    expect(result.ok).toBeTruthy();
    expect(upserts[0].prize_override).toBeNull();
  });

  it("refuses a bad amount and saves nothing", async () => {
    for (const bad of ["12.50", "-5", "lots", "100001"]) {
      const result = await saveSeason({}, form({ ...season2, prizeOverride: bad }));
      expect(result.errors?.length, bad).toBeGreaterThan(0);
    }
    expect(upserts).toHaveLength(0);
  });

  it("refuses anyone who isn't an organizer", async () => {
    isAdmin = false;
    const result = await saveSeason({}, form({ ...season2, prizeOverride: "999" }));
    expect(result.errors?.[0]).toMatch(/organizers/);
    expect(upserts).toHaveLength(0);
  });

  it("still saves dates before migration 0012 is run, but won't pretend to save an amount", async () => {
    upsertError = { code: "42703" };
    const withAmount = await saveSeason({}, form({ ...season2, prizeOverride: "50" }));
    expect(withAmount.errors?.[0]).toMatch(/0012/);
    const datesOnly = await saveSeason({}, form({ ...season2, prizeOverride: "" }));
    expect(datesOnly.ok).toBeTruthy();
    expect(upserts).toEqual([{ number: 2, starts_on: "2026-11-01", ends_on: "2026-12-20" }]);
  });

  it("still checks the dates", async () => {
    const result = await saveSeason({}, form({ number: "3", startsOn: "2026-12-01", endsOn: "2027-01-01", prizeOverride: "10" }));
    expect(result.errors?.[0]).toMatch(/overlap/);
    expect(upserts).toHaveLength(0);
  });
});
