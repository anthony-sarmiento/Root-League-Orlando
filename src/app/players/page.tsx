import type { Metadata } from "next";
import Link from "next/link";
import { getLeagueData } from "@/lib/data";
import { pct } from "@/lib/format";
import { getFaction } from "@/lib/league";
import { buildPlayerProfile } from "@/lib/stats";
import { FactionBadge } from "@/components/FactionBadge";

export const metadata: Metadata = { title: "Players" };
export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const { players, games } = await getLeagueData();
  const profiles = players
    .map((p) => buildPlayerProfile(p, players, games))
    .sort((a, b) => b.games - a.games || a.player.name.localeCompare(b.player.name));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-bold">Players</h1>
        <p className="mt-1 text-bark-soft">Everyone who&apos;s sat down at the table. Lifetime stats across all seasons.</p>
      </header>

      {profiles.length === 0 && (
        <p className="card stitched p-6 text-center text-bark-soft">
          No players have joined yet. Once an organizer adds players, they&apos;ll gather here. 🍄
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <li key={p.player.id}>
            <Link href={`/players/${p.player.id}`} className="card stitched block p-5 transition-transform hover:-translate-y-0.5">
              <h2 className="text-2xl font-bold">{p.player.name}</h2>
              <p className="mt-1 text-sm text-bark-soft">
                {p.games} games · {p.wins} wins · {pct(p.winrate)} win rate
              </p>
              {p.bestFaction ? (
                <p className="mt-3 flex items-center gap-2 text-sm">
                  <FactionBadge faction={p.bestFaction.faction} size={26} />
                  <span>
                    Best: <strong>{getFaction(p.bestFaction.faction).name}</strong>
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-sm text-bark-soft">No games yet</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
