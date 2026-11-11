import Link from "next/link";
import type { LeaderboardRow } from "@/lib/stats";
import { pct } from "@/lib/format";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function LeaderboardTable({ rows, compact = false }: { rows: LeaderboardRow[]; compact?: boolean }) {
  if (rows.length === 0) {
    return <p className="p-6 text-center text-bark-soft">No games played yet this season. The woods are quiet… 🍃</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="woods-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
            <th scope="col" className="num">LP</th>
            <th scope="col" className="num">Games</th>
            <th scope="col" className="num">Wins</th>
            {!compact && <th scope="col" className="num">Win rate</th>}
            {!compact && <th scope="col" className="num">Avg place</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.player.id}>
              <td className="w-12 font-display text-lg font-bold">
                {MEDALS[r.rank] ?? r.rank}
              </td>
              <td>
                <Link
                  href={`/players/${r.player.id}`}
                  className="font-bold underline decoration-leaf decoration-2 underline-offset-4 hover:text-moss-deep"
                >
                  {r.player.name}
                </Link>
              </td>
              <td className="num font-display text-lg font-bold text-acorn">{r.lp}</td>
              <td className="num">{r.games}</td>
              <td className="num">{r.wins}</td>
              {!compact && <td className="num">{pct(r.winrate)}</td>}
              {!compact && <td className="num">{r.avgPlacement.toFixed(2)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
