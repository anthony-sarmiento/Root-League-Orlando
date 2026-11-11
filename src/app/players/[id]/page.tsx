import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FactionBadge } from "@/components/FactionBadge";
import { getLeagueData } from "@/lib/data";
import { formatDate, ordinal, pct } from "@/lib/format";
import { getFaction } from "@/lib/league";
import { buildPlayerProfile } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/players/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { players } = await getLeagueData();
  const player = players.find((p) => p.id === id);
  return { title: player?.name ?? "Player" };
}

export default async function PlayerPage({ params }: PageProps<"/players/[id]">) {
  const { id } = await params;
  const { players, games } = await getLeagueData();
  const player = players.find((p) => p.id === id);
  if (!player) notFound();

  const profile = buildPlayerProfile(player, players, games);
  const best = profile.bestFaction;

  const stats = [
    { label: "Games", value: profile.games },
    { label: "Wins", value: profile.wins },
    { label: "Win rate", value: pct(profile.winrate) },
    { label: "Avg place", value: profile.games ? profile.avgPlacement.toFixed(2) : "–" },
    { label: "Lifetime LP", value: profile.lp },
  ];

  return (
    <div className="space-y-6">
      <p>
        <Link href="/players" className="font-bold text-moss-deep hover:underline">← All players</Link>
      </p>
      <h1 className="text-4xl font-bold">{player.name}</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-bark-soft">{s.label}</p>
            <p className="font-display text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </section>

      {best && (
        <section className="card stitched flex items-center gap-4 p-5">
          <FactionBadge faction={best.faction} size={56} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-bark-soft">Best faction</p>
            <p className="font-display text-2xl font-bold">{getFaction(best.faction).name}</p>
            <p className="text-sm text-bark-soft">
              {best.wins} {best.wins === 1 ? "win" : "wins"} in {best.games} games · {pct(best.winrate)}
            </p>
          </div>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="p-5 pb-2 text-xl font-bold">Faction record</h2>
          <div className="overflow-x-auto">
            <table className="woods-table">
              <thead>
                <tr>
                  <th scope="col">Faction</th>
                  <th scope="col" className="num">Games</th>
                  <th scope="col" className="num">Wins</th>
                  <th scope="col" className="num">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {profile.byFaction.map((f) => (
                  <tr key={f.faction}>
                    <td><FactionBadge faction={f.faction} size={26} showName /></td>
                    <td className="num">{f.games}</td>
                    <td className="num">{f.wins}</td>
                    <td className="num">{pct(f.winrate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 className="p-5 pb-2 text-xl font-bold">Season history</h2>
          <div className="overflow-x-auto">
            <table className="woods-table">
              <thead>
                <tr>
                  <th scope="col">Season</th>
                  <th scope="col" className="num">Rank</th>
                  <th scope="col" className="num">LP</th>
                  <th scope="col" className="num">W / G</th>
                </tr>
              </thead>
              <tbody>
                {profile.bySeason.map((s) => (
                  <tr key={s.season.number}>
                    <td>
                      <Link href={`/leaderboard?season=${s.season.number}`} className="font-semibold hover:text-moss-deep">
                        {s.season.label}
                      </Link>
                    </td>
                    <td className="num">{ordinal(s.rank)}</td>
                    <td className="num font-bold text-acorn">{s.lp}</td>
                    <td className="num">{s.wins} / {s.games}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card">
        <h2 className="p-5 pb-2 text-xl font-bold">Game log</h2>
        <div className="overflow-x-auto">
          <table className="woods-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Faction</th>
                <th scope="col" className="num">Finish</th>
                <th scope="col" className="num">LP</th>
                <th scope="col">Table</th>
              </tr>
            </thead>
            <tbody>
              {profile.history.map((h) => (
                <tr key={h.gameId}>
                  <td className="whitespace-nowrap">{formatDate(h.playedOn)}</td>
                  <td><FactionBadge faction={h.faction} size={26} showName /></td>
                  <td className="num font-bold">{ordinal(h.placement)}</td>
                  <td className="num font-bold text-acorn">+{h.lp}</td>
                  <td className="text-sm text-bark-soft">
                    {h.opponents.map((o) => o.player.name).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
