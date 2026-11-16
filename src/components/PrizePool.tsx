import { Coins } from "lucide-react";
import { dollars } from "@/lib/format";
import { ENTRY_FEE } from "@/lib/league";
import type { PrizePool as Pool } from "@/lib/stats";

interface Props {
  pool: Pool;
  /** "Season 2". */
  seasonName: string;
  /** Who is ahead (or who won, once the season is over). */
  leaderName?: string;
  finished?: boolean;
}

/** The season's prize pool: a purse of coins, the amount, and how it adds up. */
export function PrizePool({ pool, seasonName, leaderName, finished = false }: Props) {
  return (
    <section
      className="card card-paper stitched flex flex-wrap items-center gap-x-6 gap-y-4 p-5 sm:p-7"
      aria-label={`${seasonName} prize pool`}
    >
      <span className="prize-purse" aria-hidden="true">
        <Coins size={34} strokeWidth={2} />
      </span>

      <div className="min-w-0">
        <p className="text-sm font-bold tracking-[0.1em] text-bark-soft uppercase">{seasonName} prize pool</p>
        <p className="font-display text-6xl leading-none font-extrabold tabular text-acorn-deep sm:text-7xl">
          {dollars(pool.amount)}
        </p>
      </div>

      <div className="min-w-[16rem] flex-1 space-y-1.5 text-bark-soft">
        <p>
          Every player adds <strong className="text-bark">{dollars(ENTRY_FEE)}</strong> for each game night they play.
        </p>
        <p className="text-sm">
          {pool.overridden
            ? "This amount was set by the organizers."
            : pool.entries === 0
              ? "No entries yet. The pool starts with the first game night."
              : `${pool.entries} ${pool.entries === 1 ? "entry" : "entries"} × ${dollars(ENTRY_FEE)} across ${pool.nights} ${pool.nights === 1 ? "night" : "nights"}.`}
        </p>
        <p className="font-semibold text-bark">
          {finished && leaderName
            ? `Won by ${leaderName}.`
            : leaderName
              ? `${leaderName} is in front. 1st place takes it all.`
              : "1st place takes it all."}
        </p>
      </div>
    </section>
  );
}
