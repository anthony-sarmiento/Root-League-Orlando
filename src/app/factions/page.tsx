import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FactionBadge } from "@/components/FactionBadge";
import { PageHeader } from "@/components/PageHeader";
import { SeasonPicker, parseSeasonParam } from "@/components/SeasonPicker";
import { getLeagueData } from "@/lib/data";
import { pct } from "@/lib/format";
import { PLAYERS_PER_GAME, getFaction } from "@/lib/league";
import { buildFactionStats, gamesInSeason } from "@/lib/stats";

export const metadata: Metadata = { title: "Factions" };
export const dynamic = "force-dynamic";

export default async function FactionsPage({ searchParams }: PageProps<"/factions">) {
  const { season: seasonParam } = await searchParams;
  const { players, games, seasons } = await getLeagueData();
  const selected = parseSeasonParam(seasonParam, seasons.map((s) => s.number), "all", true);
  const selectedSeason = selected === "all" ? undefined : seasons.find((s) => s.number === selected);
  const scoped = selectedSeason ? gamesInSeason(games, selectedSeason) : games;
  const rows = buildFactionStats(players, scoped);
  const fairShare = 1 / PLAYERS_PER_GAME;
  const playerById = new Map(players.map((p) => [p.id, p]));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Factions"
        pattern="eyrie"
        crew={[{ id: "tory", w: 150 }, { id: "envoy", w: 130, f: -1 }, { id: "cenric", w: 160, f: -1 }]}
        description="Current League Faction Winrates"
      >
        <SeasonPicker basePath="/factions" seasons={seasons} selected={selected} includeAll />
      </PageHeader>

      <section className="card">
        <div className="overflow-x-auto">
          <table className="woods-table">
            <thead>
              <tr>
                <th scope="col">Faction</th>
                <th scope="col" className="num">Games</th>
                <th scope="col" className="num">Wins</th>
                <th scope="col">Win rate</th>
                <th scope="col" className="num hidden sm:table-cell">Avg place</th>
                <th scope="col" className="hidden md:table-cell">Top player</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const faction = getFaction(r.faction);
                const top = r.topPlayer ? (playerById.get(r.topPlayer.player.id) ?? r.topPlayer.player) : null;
                return (
                  <tr key={r.faction}>
                    <td><FactionBadge faction={r.faction} size={36} showName /></td>
                    <td className="num">{r.games}</td>
                    <td className="num">{r.wins}</td>
                    <td>
                      {r.games ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="relative h-2.5 w-20 shrink-0 rounded-full bg-parchment-deep sm:w-28"
                            role="img"
                            aria-label={`${pct(r.winrate)} win rate`}
                          >
                            <div
                              className="grow-x h-full rounded-full"
                              style={{ width: `${Math.min(100, r.winrate * 100)}%`, backgroundColor: faction.color }}
                            />
                            <span
                              className="absolute -top-1 h-4.5 w-0.5 bg-bark/60"
                              style={{ left: `${fairShare * 100}%` }}
                              aria-hidden="true"
                            />
                          </div>
                          <span className="tabular font-bold">{pct(r.winrate)}</span>
                        </div>
                      ) : (
                        <span className="text-bark-soft">–</span>
                      )}
                    </td>
                    <td className="num hidden sm:table-cell">{r.games ? r.avgPlacement.toFixed(2) : "–"}</td>
                    <td className="hidden md:table-cell">
                      {r.topPlayer && top ? (
                        <Link
                          href={`/players/${r.topPlayer.player.id}`}
                          className="inline-flex items-center gap-2 font-semibold hover:text-moss-deep"
                        >
                          <Avatar name={top.name} avatar={top.avatar} bg={top.avatarBg} crop={top.avatarCrop} size={28} />
                          {top.name} <span className="text-sm text-bark-soft">({r.topPlayer.wins})</span>
                        </Link>
                      ) : (
                        <span className="text-bark-soft">–</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t-2 border-dashed border-bark/15 px-5 py-4 text-sm text-bark-soft">
          In a {PLAYERS_PER_GAME}-player game an evenly matched faction wins {pct(fairShare)} of the time. The tick on
          each bar marks that line.
        </p>
      </section>
    </div>
  );
}
