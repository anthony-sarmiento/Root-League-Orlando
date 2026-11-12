import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { Player } from "@/lib/league";
import type { LeaderboardRow } from "@/lib/stats";
import { pct } from "@/lib/format";

const MEDAL_COLORS: Record<number, string> = { 1: "#e2b04a", 2: "#bdb7a8", 3: "#c58a5a" };

function Rank({ rank }: { rank: number }) {
  const color = MEDAL_COLORS[rank];
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-full font-display text-base font-bold"
      style={color ? { backgroundColor: color, border: "2px solid rgba(75,52,38,.25)" } : undefined}
    >
      {rank}
    </span>
  );
}

interface Props {
  rows: LeaderboardRow[];
  players: Player[];
  compact?: boolean;
  emptyMessage?: string;
  /** The signed-in player's id, so their row stands out. */
  highlightId?: string;
}

export function LeaderboardTable({ rows, players, compact = false, emptyMessage, highlightId }: Props) {
  if (rows.length === 0) {
    return (
      <p className="p-6 text-center text-bark-soft">
        {emptyMessage ?? "No games played yet. The woods are quiet…"}
      </p>
    );
  }

  const byId = new Map(players.map((p) => [p.id, p]));
  const topLp = Math.max(1, ...rows.map((r) => r.lp));

  return (
    <div className="overflow-x-auto">
      <table className="woods-table">
        <thead>
          <tr>
            <th scope="col" className="sm:w-14">
              <span aria-hidden="true" className="sm:hidden">#</span>
              <span className="sr-only sm:not-sr-only">Rank</span>
            </th>
            <th scope="col">Player</th>
            <th scope="col" className="num">LP</th>
            <th scope="col" className="num hidden min-[420px]:table-cell">Games</th>
            <th scope="col" className="num">Wins</th>
            {!compact && <th scope="col" className="num hidden sm:table-cell">Win rate</th>}
            {!compact && <th scope="col" className="num hidden sm:table-cell">Avg place</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const player = byId.get(r.player.id) ?? r.player;
            return (
              <tr key={r.player.id} className={r.player.id === highlightId ? "me" : undefined}>
                <td><Rank rank={r.rank} /></td>
                <td className="w-full max-w-0">
                  <Link
                    href={`/players/${r.player.id}`}
                    className="flex items-center gap-2.5 font-bold hover:text-moss-deep sm:gap-3"
                  >
                    <Avatar name={player.name} avatar={player.avatar} bg={player.avatarBg} crop={player.avatarCrop} size={40} />
                    <span className="truncate underline decoration-leaf decoration-2 underline-offset-4">{r.player.name}</span>
                  </Link>
                </td>
                <td className="num w-24 sm:w-32">
                  <span className="block font-display text-lg leading-tight font-bold text-acorn-deep">{r.lp}</span>
                  <span className="lp-track mt-1 block" aria-hidden="true">
                    <span className="lp-fill grow-x block" style={{ width: `${(r.lp / topLp) * 100}%` }} />
                  </span>
                </td>
                <td className="num hidden min-[420px]:table-cell">{r.games}</td>
                <td className="num">{r.wins}</td>
                {!compact && <td className="num hidden sm:table-cell">{pct(r.winrate)}</td>}
                {!compact && <td className="num hidden sm:table-cell">{r.avgPlacement.toFixed(2)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
