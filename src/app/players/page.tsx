import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FactionBadge } from "@/components/FactionBadge";
import { PageHeader } from "@/components/PageHeader";
import { getLeagueData } from "@/lib/data";
import { pct } from "@/lib/format";
import { getFaction } from "@/lib/league";
import { buildPlayerProfile } from "@/lib/stats";

export const metadata: Metadata = { title: "Players" };
export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const { players, games, seasons } = await getLeagueData();
  const profiles = players
    .map((p) => buildPlayerProfile(p, players, games, seasons))
    .sort((a, b) => b.games - a.games || a.player.name.localeCompare(b.player.name));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Players"
        pattern="lizards"
        description="Everyone who has sat down at the table. Records cover every season."
      />

      {profiles.length === 0 && (
        <p className="card stitched p-6 text-center text-bark-soft">
          No players have joined yet. Once someone makes a profile, they&apos;ll gather here.
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => {
          const favorite = p.player.favoriteFaction ?? p.bestFaction?.faction;
          return (
            <li key={p.player.id}>
              <Link href={`/players/${p.player.id}`} className="card flex h-full gap-4 p-5">
                <Avatar name={p.player.name} avatar={p.player.avatar} size={72} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-2xl font-bold">{p.player.name}</h2>
                  <p className="text-sm text-bark-soft">
                    {p.games === 0
                      ? "No games yet"
                      : `${p.games} ${p.games === 1 ? "game" : "games"} · ${p.wins} ${p.wins === 1 ? "win" : "wins"} · ${pct(p.winrate)}`}
                  </p>
                  {p.player.bio && <p className="mt-1 line-clamp-2 text-sm">{p.player.bio}</p>}
                  {favorite && (
                    <p className="mt-2 flex items-center gap-2 text-sm">
                      <FactionBadge faction={favorite} size={24} />
                      <span>
                        <span className="text-bark-soft">{p.player.favoriteFaction ? "Favorite: " : "Best: "}</span>
                        <strong>{getFaction(favorite).name}</strong>
                      </span>
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
