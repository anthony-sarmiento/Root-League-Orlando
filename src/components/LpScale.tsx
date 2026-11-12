import { ordinal } from "@/lib/format";
import { LP_BY_PLACEMENT, PLACEMENTS } from "@/lib/league";

const STEP_COLORS: Record<number, string> = {
  1: "#e2b04a", // gold
  2: "#bdb7a8", // silver
  3: "#c58a5a", // bronze
  4: "#9bb86a", // moss
};

/** League points by finishing place, drawn as a little podium so the scoring reads at a glance. */
export function LpScale() {
  const max = Math.max(...Object.values(LP_BY_PLACEMENT));

  return (
    <ol className="flex items-end gap-2 sm:gap-3" aria-label="League points by finishing place">
      {PLACEMENTS.map((place) => {
        const lp = LP_BY_PLACEMENT[place];
        return (
          <li key={place} className="flex flex-1 flex-col items-center">
            <span className="font-display text-3xl font-bold tabular text-bark sm:text-4xl">
              {lp}
              <span className="ml-0.5 text-base font-semibold text-bark-soft">LP</span>
            </span>
            <span
              className="grow-up mt-1 w-full rounded-t-xl border-2 border-b-0 border-bark/25"
              style={{ height: 28 + (lp / max) * 64, backgroundColor: STEP_COLORS[place] }}
              aria-hidden="true"
            />
            <span className="w-full rounded-b-lg bg-bark px-1 py-1 text-center text-sm font-bold text-parchment">
              {ordinal(place)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
