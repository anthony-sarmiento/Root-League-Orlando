import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { Player } from "@/lib/league";
import type { LeaderboardRow } from "@/lib/stats";

// Step styling follows the player's actual rank, so players tied for 1st both stand on a gold step.
const STEPS = [
  { color: "#e2b04a", height: 84, avatar: 88 }, // rank 1
  { color: "#bdb7a8", height: 60, avatar: 68 }, // rank 2
  { color: "#c58a5a", height: 44, avatar: 68 }, // rank 3 and below
];

/** The top three on a podium, leader in the middle. */
export function Podium({ rows, players }: { rows: LeaderboardRow[]; players: Player[] }) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;

  // Visual order: 2nd, 1st, 3rd.
  const slots = [1, 0, 2];

  return (
    <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4" aria-label="Top three">
      {slots.map((position) => {
        const row = top[position];
        if (!row) return <li key={position} aria-hidden="true" />;
        const step = STEPS[Math.min(row.rank, 3) - 1];
        const player = byId.get(row.player.id) ?? row.player;
        return (
          <li key={row.player.id} className="flex flex-col items-center text-center">
            <Avatar name={player.name} avatar={player.avatar} bg={player.avatarBg} crop={player.avatarCrop} size={step.avatar} />
            <Link
              href={`/players/${row.player.id}`}
              className="mt-2 max-w-full truncate font-display text-base font-bold hover:text-moss-deep sm:text-lg"
            >
              {row.player.name}
            </Link>
            <span className="tabular text-sm font-bold text-acorn-deep">{row.lp} LP</span>
            <span
              className="grow-up mt-2 flex w-full items-start justify-center rounded-t-2xl border-2 border-b-0 border-bark/25 pt-2 font-display text-3xl font-bold text-bark"
              style={{ height: step.height, backgroundColor: step.color }}
            >
              {row.rank}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
