import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Banner } from "@/components/Banner";
import { CritterCrew } from "@/components/Critters";
import { FactionBadge } from "@/components/FactionBadge";
import { SectionHeading } from "@/components/SectionHeading";
import { FACTION_CRITTER } from "@/lib/critters";
import { getLeagueData } from "@/lib/data";
import { ordinal, pct } from "@/lib/format";
import { FACTIONS, LP_BY_PLACEMENT, PLAYERS_PER_GAME, getFaction, type Placement } from "@/lib/league";
import { asFactionId } from "@/lib/profile";
import { featuredSeason, seasonPhase, todayISO } from "@/lib/seasons";
import { MIN_MATCHUP_TABLES, buildFactionDetail, buildFactionStats, gamesInSeason, type FactionDetail, type Matchup } from "@/lib/stats";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return FACTIONS.map((f) => ({ id: f.id }));
}

export async function generateMetadata({ params }: PageProps<"/factions/[id]">): Promise<Metadata> {
  const { id } = await params;
  const faction = asFactionId(id);
  return { title: faction ? getFaction(faction).name : "Faction" };
}

const FINISH_COLORS = ["#e2b04a", "#bdb7a8", "#c58a5a", "#9bb86a"];

/** A headline set of numbers for one faction over one stretch of games. */
function StatsCard({ title, note, detail, color }: { title: string; note?: string; detail: FactionDetail | null; color: string }) {
  const fairShare = 1 / PLAYERS_PER_GAME;
  return (
    <section className="card p-6 sm:p-8">
      <h2 className="text-3xl font-bold">{title}</h2>
      {note && <p className="mt-1 text-bark-soft">{note}</p>}
      {!detail || detail.games === 0 ? (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-bark/25 p-6 text-center text-bark-soft">
          {detail ? "Not played yet in this stretch." : "No season to show yet."}
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-bark-soft uppercase">Win rate</p>
            <p className="font-display text-7xl leading-none font-bold tabular">{pct(detail.winrate)}</p>
            <div
              className="relative mt-3 h-3 rounded-full bg-bark/15"
              role="img"
              aria-label={`${pct(detail.winrate)} win rate; an even faction would win ${pct(fairShare)}`}
            >
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, detail.winrate * 100)}%`, backgroundColor: color }} />
              <span className="absolute -top-1 h-5 w-0.5 bg-bark/70" style={{ left: `${fairShare * 100}%` }} aria-hidden="true" />
            </div>
            <p className="mt-1.5 text-sm text-bark-soft">The tick marks {pct(fairShare)}, an even share of wins.</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "LP earned", value: detail.lp },
              { label: "Games", value: detail.games },
              { label: "Wins", value: detail.wins },
              { label: "Avg finish", value: detail.avgPlacement.toFixed(2) },
            ].map((s) => (
              <div key={s.label} className="lp-cell">
                <dt>{s.label}</dt>
                <dd className="tabular">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}

/** One highlighted matchup: who, and how often it went that way. */
function MatchupCard({ kind, matchup, faction }: { kind: "rival" | "best"; matchup: Matchup | null; faction: string }) {
  const rival = kind === "rival";
  const count = matchup ? (rival ? matchup.losses : matchup.wins) : 0;
  return (
    <div className="rounded-2xl border-2 border-bark/20 bg-paper/60 p-5">
      <p className="text-sm font-semibold tracking-[0.08em] text-bark-soft uppercase">{rival ? "Rival faction" : "Best matchup"}</p>
      {matchup ? (
        <>
          <Link href={`/factions/${matchup.opponent}`} className="mt-3 inline-flex hover:text-moss-deep">
            <FactionBadge faction={matchup.opponent} size={56} showName />
          </Link>
          <p className="mt-3 text-bark-soft">
            {faction} {rival ? "finished below" : "finished above"} them at{" "}
            <strong className="text-bark">
              {count} of {matchup.tables}
            </strong>{" "}
            shared tables ({pct(count / matchup.tables)}).
          </p>
        </>
      ) : (
        <p className="mt-3 text-bark-soft">
          Not enough tables yet. It takes {MIN_MATCHUP_TABLES} shared tables with another faction to name one.
        </p>
      )}
    </div>
  );
}

export default async function FactionPage({ params }: PageProps<"/factions/[id]">) {
  const { id } = await params;
  const factionId = asFactionId(id);
  if (!factionId) notFound();
  const faction = getFaction(factionId);

  const { players, games, seasons } = await getLeagueData();
  const today = todayISO();
  const season = featuredSeason(seasons, today);
  const seasonName = season ? season.label.split(" · ")[0] : "Current season";

  const allTime = buildFactionDetail(factionId, players, games);
  const current = season ? buildFactionDetail(factionId, players, gamesInSeason(games, season)) : null;
  const seasonLpByPlayer = new Map((current?.players ?? []).map((p) => [p.player.id, p.lp]));

  const ranking = buildFactionStats(players, games).filter((r) => r.games > 0);
  const rank = ranking.findIndex((r) => r.faction === factionId) + 1;

  const perSeason = seasons
    .map((s) => ({ season: s, detail: buildFactionDetail(factionId, players, gamesInSeason(games, s)) }))
    .filter((x) => x.detail.games > 0)
    .reverse();

  const finishTotal = allTime.placements.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-14">
      <Banner pattern={factionId}>
        <div className="relative py-10 sm:py-14">
          <Link href="/factions" className="inline-flex items-center gap-1.5 font-bold text-[#f2c868] hover:underline">
            <ArrowLeft size={18} aria-hidden="true" /> All factions
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-6">
            <FactionBadge faction={factionId} size={128} />
            <div className="min-w-0 flex-1">
              <h1 className="text-5xl font-bold sm:text-6xl">{faction.name}</h1>
              <p className="mt-3 max-w-[48ch] text-lg text-parchment/85 sm:text-xl lg:max-w-[34ch]">
                {allTime.games === 0
                  ? "Nobody has played this faction in the league yet."
                  : `${rank ? `Ranked ${ordinal(rank)} of ${ranking.length} factions by win rate. ` : ""}Played in ${allTime.games} ${allTime.games === 1 ? "game" : "games"} across the league.`}
              </p>
            </div>
          </div>
          <CritterCrew members={[{ id: FACTION_CRITTER[factionId], w: 200, f: -1 }]} />
        </div>
      </Banner>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatsCard title="All time" note="Every game in the league" detail={allTime} color={faction.color} />
        <StatsCard
          title={seasonName}
          note={
            season
              ? `${season.label.split(" · ")[1]}${seasonPhase(season, today) === "upcoming" ? " · not started yet" : ""}`
              : undefined
          }
          detail={current}
          color={faction.color}
        />
      </div>

      {finishTotal > 0 && (
        <section className="card p-6 sm:p-8">
          <h2 className="text-3xl font-bold">How it finishes</h2>
          <p className="mt-1 text-bark-soft">Where this faction ends up at the table, across all {finishTotal} games.</p>
          <div className="mt-6 flex h-12 overflow-hidden rounded-2xl border-2 border-bark/30" role="img" aria-label={allTime.placements.map((n, i) => `${n} ${ordinal(i + 1)} place finishes`).join(", ")}>
            {allTime.placements.map((n, i) =>
              n > 0 ? (
                <div
                  key={i}
                  className="flex items-center justify-center text-sm font-bold text-bark"
                  style={{ width: `${(n / finishTotal) * 100}%`, backgroundColor: FINISH_COLORS[i] }}
                >
                  {n}
                </div>
              ) : null,
            )}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {allTime.placements.map((n, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border border-bark/30" style={{ backgroundColor: FINISH_COLORS[i] }} aria-hidden="true" />
                <span className="font-bold">{ordinal(i + 1)}</span>
                <span className="text-bark-soft">
                  {n} · {LP_BY_PLACEMENT[(i + 1) as Placement]} LP each
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {allTime.games > 0 && (
        <section className="card p-6 sm:p-8">
          <h2 className="text-3xl font-bold">Matchups</h2>
          <p className="mt-1 text-bark-soft">
            Against each faction it has shared a table with: who finished higher. The rival is the faction it loses to
            most often, the best matchup the one it beats most often.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <MatchupCard kind="rival" matchup={allTime.matchups.rival} faction={faction.name} />
            <MatchupCard kind="best" matchup={allTime.matchups.best} faction={faction.name} />
          </div>
          {allTime.matchups.matchups.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="woods-table">
                <thead>
                  <tr>
                    <th scope="col">Against</th>
                    <th scope="col" className="num">Tables</th>
                    <th scope="col" className="num">Won</th>
                    <th scope="col" className="num">Lost</th>
                    <th scope="col" className="hidden sm:table-cell">Record</th>
                  </tr>
                </thead>
                <tbody>
                  {allTime.matchups.matchups.map((m) => (
                    <tr key={m.opponent}>
                      <td>
                        <Link href={`/factions/${m.opponent}`} className="inline-flex hover:text-moss-deep">
                          <FactionBadge faction={m.opponent} size={32} showName />
                        </Link>
                      </td>
                      <td className="num">{m.tables}</td>
                      <td className="num">{m.wins}</td>
                      <td className="num">{m.losses}</td>
                      <td className="hidden sm:table-cell">
                        <div
                          className="flex h-2.5 w-28 overflow-hidden rounded-full bg-parchment-deep"
                          role="img"
                          aria-label={`Finished above ${m.wins} times and below ${m.losses} times out of ${m.tables}`}
                        >
                          <div className="h-full bg-moss" style={{ width: `${(m.wins / m.tables) * 100}%` }} />
                          <div className="h-full bg-berry" style={{ width: `${(m.losses / m.tables) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="space-y-5">
        <SectionHeading onDark title={`Who plays ${faction.name}`} description="Everyone who has taken this faction to the table." />
        {allTime.players.length === 0 ? (
          <p className="card p-6 text-bark-soft">No players yet. Log a game with this faction and they will show up here.</p>
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="woods-table">
                <thead>
                  <tr>
                    <th scope="col">Player</th>
                    <th scope="col" className="num">Games</th>
                    <th scope="col" className="num">Wins</th>
                    <th scope="col" className="num hidden sm:table-cell">Win rate</th>
                    <th scope="col" className="num">LP</th>
                    {season && <th scope="col" className="num hidden sm:table-cell">{seasonName} LP</th>}
                  </tr>
                </thead>
                <tbody>
                  {allTime.players.map((r) => (
                    <tr key={r.player.id}>
                      <td className="w-full max-w-0">
                        <Link href={`/players/${r.player.id}`} className="flex items-center gap-3 font-bold hover:text-moss-deep">
                          <Avatar name={r.player.name} avatar={r.player.avatar} bg={r.player.avatarBg} crop={r.player.avatarCrop} size={40} />
                          <span className="truncate">{r.player.name}</span>
                        </Link>
                      </td>
                      <td className="num">{r.games}</td>
                      <td className="num">{r.wins}</td>
                      <td className="num hidden sm:table-cell">{pct(r.winrate)}</td>
                      <td className="num font-display text-lg font-bold text-acorn-deep">{r.lp}</td>
                      {season && <td className="num hidden sm:table-cell">{seasonLpByPlayer.get(r.player.id) ?? 0}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {perSeason.length > 0 && (
        <section className="space-y-5">
          <SectionHeading onDark title="Season by season" />
          <div className="card">
            <div className="overflow-x-auto">
              <table className="woods-table">
                <thead>
                  <tr>
                    <th scope="col">Season</th>
                    <th scope="col" className="num">Games</th>
                    <th scope="col" className="num">Wins</th>
                    <th scope="col" className="num">Win rate</th>
                    <th scope="col" className="num">LP earned</th>
                  </tr>
                </thead>
                <tbody>
                  {perSeason.map(({ season: s, detail }) => (
                    <tr key={s.number}>
                      <td>
                        <Link href={`/leaderboard?season=${s.number}`} className="font-bold hover:text-moss-deep">
                          {s.label.split(" · ")[0]}
                        </Link>
                        <span className="block text-xs text-bark-soft">{s.label.split(" · ")[1]}</span>
                      </td>
                      <td className="num">{detail.games}</td>
                      <td className="num">{detail.wins}</td>
                      <td className="num">{pct(detail.winrate)}</td>
                      <td className="num font-display text-lg font-bold text-acorn-deep">{detail.lp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
