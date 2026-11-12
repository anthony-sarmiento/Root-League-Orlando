import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Banner } from "@/components/Banner";
import { FactionBadge } from "@/components/FactionBadge";
import { getLeagueData } from "@/lib/data";
import { formatDate, ordinal, pct } from "@/lib/format";
import { getFaction } from "@/lib/league";
import { buildPlayerProfile } from "@/lib/stats";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

const FORM_COLORS: Record<number, string> = { 1: "#e2b04a", 2: "#bdb7a8", 3: "#c58a5a", 4: "#9bb86a" };

export async function generateMetadata({ params }: PageProps<"/players/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { players } = await getLeagueData();
  const player = players.find((p) => p.id === id);
  return { title: player?.name ?? "Player" };
}

export default async function PlayerPage({ params }: PageProps<"/players/[id]">) {
  const { id } = await params;
  const [{ players, games, seasons }, viewer] = await Promise.all([getLeagueData(), getViewer()]);
  const player = players.find((p) => p.id === id);
  if (!player) notFound();

  const profile = buildPlayerProfile(player, players, games, seasons);
  const best = profile.bestFaction;
  const favorite = player.favoriteFaction ?? best?.faction;
  const isMe = viewer?.player?.id === player.id;

  return (
    <div className="space-y-8">
      <Banner pattern={favorite ?? "alliance"}>
        <div className="py-8 sm:py-12">
          <Link href="/players" className="inline-flex items-center gap-1.5 font-bold text-[#f2c868] hover:underline">
            <ArrowLeft size={18} aria-hidden="true" /> All players
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-6">
            <Avatar name={player.name} avatar={player.avatar} bg={player.avatarBg} size={152} className="shadow-[0_14px_26px_-8px_rgba(0,0,0,0.6)] ring-4 ring-honey/70" />
            <div className="min-w-0 flex-1 space-y-3">
              <h1 className="text-5xl font-bold sm:text-6xl">{player.name}</h1>
              {player.bio && <p className="max-w-[55ch] text-lg text-parchment/90">{player.bio}</p>}
              {favorite && (
                <p className="flex items-center gap-2">
                  <FactionBadge faction={favorite} size={36} />
                  <span>
                    <span className="text-parchment/75">{player.favoriteFaction ? "Favorite faction: " : "Best faction: "}</span>
                    <strong>{getFaction(favorite).name}</strong>
                  </span>
                </p>
              )}
              {profile.history.length > 0 && (
                <div>
                  <p className="mb-1.5 text-sm text-parchment/75">Recent finishes, newest first</p>
                  <ol className="flex flex-wrap gap-1.5">
                    {profile.history.slice(0, 10).map((h) => (
                      <li
                        key={h.gameId}
                        className="form-dot"
                        style={{ backgroundColor: FORM_COLORS[h.placement] }}
                        title={`${ordinal(h.placement)} on ${formatDate(h.playedOn)}`}
                      >
                        {h.placement}
                        <span className="sr-only">{ordinal(h.placement)} place on {formatDate(h.playedOn)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {isMe && (
                <Link href="/account" className="btn secondary small mt-1">
                  <Pencil size={16} aria-hidden="true" /> Edit profile
                </Link>
              )}
            </div>
          </div>
        </div>
      </Banner>

      <section className="card p-5 sm:p-7">
        <h2 className="text-2xl font-bold">Lifetime record</h2>
        {profile.games === 0 ? (
          <p className="mt-2 text-bark-soft">No games played yet. Their story starts at the next game night.</p>
        ) : (
          <p className="mt-2 font-display text-xl leading-relaxed sm:text-2xl">
            <strong className="tabular">{profile.games}</strong> {profile.games === 1 ? "game" : "games"},{" "}
            <strong className="tabular">{profile.wins}</strong> {profile.wins === 1 ? "win" : "wins"} (
            <strong className="tabular">{pct(profile.winrate)}</strong>), averaging{" "}
            <strong className="tabular">{ordinal(Math.round(profile.avgPlacement))}</strong> place (
            <span className="tabular">{profile.avgPlacement.toFixed(2)}</span>), and{" "}
            <strong className="tabular text-acorn-deep">{profile.lp} LP</strong> earned in all.
          </p>
        )}
        {best && (
          <p className="mt-3 text-bark-soft">
            Most successful faction: <strong className="text-bark">{getFaction(best.faction).name}</strong>, with{" "}
            {best.wins} {best.wins === 1 ? "win" : "wins"} in {best.games} {best.games === 1 ? "game" : "games"} (
            {pct(best.winrate)}).
          </p>
        )}
      </section>

      {profile.games > 0 && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="card">
              <h2 className="p-5 pb-2 text-2xl font-bold">Faction record</h2>
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
                        <td><FactionBadge faction={f.faction} size={30} showName /></td>
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
              <h2 className="p-5 pb-2 text-2xl font-bold">Season history</h2>
              {profile.bySeason.length === 0 ? (
                <p className="px-5 pb-5 text-bark-soft">No games in a scheduled season yet.</p>
              ) : (
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
                              {s.season.label.split(" · ")[0]}
                            </Link>
                            <span className="block text-xs text-bark-soft">{s.season.label.split(" · ")[1]}</span>
                          </td>
                          <td className="num">{ordinal(s.rank)}</td>
                          <td className="num font-bold text-acorn-deep">{s.lp}</td>
                          <td className="num">{s.wins} / {s.games}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <section className="card">
            <h2 className="p-5 pb-2 text-2xl font-bold">Game log</h2>
            <div className="overflow-x-auto">
              <table className="woods-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Faction</th>
                    <th scope="col" className="num">Finish</th>
                    <th scope="col" className="num">LP</th>
                    <th scope="col" className="hidden sm:table-cell">Table</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.history.map((h) => (
                    <tr key={h.gameId}>
                      <td className="whitespace-nowrap">{formatDate(h.playedOn)}</td>
                      <td><FactionBadge faction={h.faction} size={30} showName /></td>
                      <td className="num font-bold">{ordinal(h.placement)}</td>
                      <td className="num font-bold text-acorn-deep">+{h.lp}</td>
                      <td className="hidden text-sm text-bark-soft sm:table-cell">
                        {h.opponents.map((o) => o.player.name).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
