import Link from "next/link";
import { Crown } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { Player } from "@/lib/league";
import type { LeaderboardRow } from "@/lib/stats";

// Step styling follows the player's actual rank, so players tied for 1st both stand on a gold step.
// `light` and `dark` shade the metal; `height` is the step and `avatar` the portrait size.
const STEPS = [
  { name: "gold", base: "#e2b04a", light: "#f6dc92", dark: "#b8822a", height: 112, avatar: 92 }, // rank 1
  { name: "silver", base: "#bdb7a8", light: "#e4e0d4", dark: "#8f897a", height: 80, avatar: 70 }, // rank 2
  { name: "bronze", base: "#c58a5a", light: "#e2b389", dark: "#93603a", height: 60, avatar: 70 }, // rank 3 and below
];

/** The top three on a carved podium, leader in the middle under a spotlight. */
export function Podium({ rows, players }: { rows: LeaderboardRow[]; players: Player[] }) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;

  // Visual order: 2nd, 1st, 3rd.
  const slots = [1, 0, 2];

  return (
    <div className="podium-stage">
      <ol className="podium" aria-label="Top three">
        {slots.map((position) => {
          const row = top[position];
          if (!row) return <li key={position} aria-hidden="true" />;
          const step = STEPS[Math.min(row.rank, 3) - 1];
          const player = byId.get(row.player.id) ?? row.player;
          const first = row.rank === 1;
          return (
            <li key={row.player.id} className="flex min-w-0 flex-col items-center text-center">
              <div className="relative">
                {first && (
                  <Crown
                    size={30}
                    strokeWidth={2.2}
                    className="absolute -top-7 left-1/2 z-10 -translate-x-1/2 fill-honey text-acorn-deep drop-shadow-[0_2px_0_rgba(75,52,38,0.35)]"
                    aria-label="Leader"
                  />
                )}
                <span
                  className="podium-ring"
                  style={{ background: `linear-gradient(140deg, ${step.light}, ${step.base} 48%, ${step.dark})` }}
                >
                  <Avatar name={player.name} avatar={player.avatar} bg={player.avatarBg} crop={player.avatarCrop} size={step.avatar} />
                </span>
              </div>
              <Link href={`/players/${row.player.id}`} className="podium-tag">
                <span className="block max-w-full truncate font-title text-base font-bold sm:text-lg">{row.player.name}</span>
                <span className="tabular block text-sm font-bold text-acorn-deep">{row.lp} LP</span>
              </Link>
              <span
                className="podium-step grow-up"
                style={
                  {
                    height: step.height,
                    "--light": step.light,
                    "--base": step.base,
                    "--dark": step.dark,
                  } as React.CSSProperties
                }
              >
                <span className="podium-numeral">{row.rank}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <span className="podium-plinth" aria-hidden="true" />
    </div>
  );
}
