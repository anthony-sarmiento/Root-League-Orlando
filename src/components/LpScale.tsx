import { ordinal } from "@/lib/format";
import { LP_BY_PLACEMENT, LP_THREE_PLAYER, PLACEMENTS } from "@/lib/league";

// Medal metals, lightest to darkest, plus a short line for each place.
const MEDALS: Record<number, { light: string; base: string; dark: string; note: string }> = {
  1: { light: "#f6dc92", base: "#e2b04a", dark: "#b8822a", note: "Take the table" },
  2: { light: "#e4e0d4", base: "#bdb7a8", dark: "#8f897a", note: "Close behind" },
  3: { light: "#e2b389", base: "#c58a5a", dark: "#93603a", note: "On the board" },
  4: { light: "#c5da98", base: "#9bb86a", dark: "#6b8a3c", note: "Every game counts" },
};

/** League points by finishing place, as four little tickets with a medal each. */
export function LpScale() {
  const max = Math.max(...Object.values(LP_BY_PLACEMENT));
  const three = ([1, 2, 3] as const).map((p) => LP_THREE_PLAYER[p]);
  const sameAsFour = three.every((lp, i) => lp === LP_BY_PLACEMENT[PLACEMENTS[i]]);

  return (
    <div className="@container">
      <ol className="grid grid-cols-2 gap-3 @lg:grid-cols-4" aria-label="League points by finishing place">
        {PLACEMENTS.map((place) => {
          const lp = LP_BY_PLACEMENT[place];
          const m = MEDALS[place];
          return (
            <li key={place} className="lp-ticket" style={{ "--base": m.base } as React.CSSProperties}>
              <span
                className="lp-medal"
                style={{ background: `radial-gradient(circle at 32% 28%, ${m.light}, ${m.base} 55%, ${m.dark})` }}
                aria-hidden="true"
              >
                {place}
              </span>
              <span className="font-display text-4xl leading-none font-extrabold tabular text-bark">
                {lp}
                <span className="ml-1 text-sm font-bold text-bark-soft">LP</span>
              </span>
              <span className="text-sm font-bold text-bark">{ordinal(place)} place</span>
              <span className="text-xs text-bark-soft">{m.note}</span>
              <span className="lp-meter" aria-hidden="true">
                <span style={{ width: `${(lp / max) * 100}%`, background: `linear-gradient(90deg, ${m.light}, ${m.base})` }} />
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 rounded-xl border-[1.5px] border-dashed border-bark/25 px-3 py-2 text-center text-sm text-bark-soft">
        {sameAsFour ? (
          <>
            At a table of 3, <strong className="text-bark">{three.join(" · ")}</strong> for 1st to 3rd.
          </>
        ) : (
          <>
            Table of 3: <strong className="text-bark">{three.join(" · ")}</strong> LP.
          </>
        )}
      </p>
    </div>
  );
}
