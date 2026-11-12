import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Crown, Trophy } from "lucide-react";
import { Banner } from "@/components/Banner";
import { CardFan, Embers } from "@/components/CardFan";
import { FactionBadge } from "@/components/FactionBadge";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { LpScale } from "@/components/LpScale";
import { Podium } from "@/components/Podium";
import { SectionHeading } from "@/components/SectionHeading";
import { SessionCard } from "@/components/SessionCard";
import { getLeagueData } from "@/lib/data";
import { formatDate, ordinal, pct } from "@/lib/format";
import { FACTIONS, PLAYERS_PER_GAME } from "@/lib/league";
import { rsvpStateFor } from "@/lib/rsvp";
import { daysBetween, featuredSeason, seasonPhase, todayISO } from "@/lib/seasons";
import { buildFactionStats, buildLeaderboard, gamesInSeason, leagueTotals } from "@/lib/stats";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ players, games, sessions, seasons, signups }, viewer] = await Promise.all([getLeagueData(), getViewer()]);
  const today = todayISO();
  const season = featuredSeason(seasons, today);
  const phase = season ? seasonPhase(season, today) : undefined;
  const leaderboard = season ? buildLeaderboard(players, gamesInSeason(games, season)) : [];
  const totals = leagueTotals(games);
  const factionStats = new Map(buildFactionStats(players, games).map((r) => [r.faction, r]));
  const daysLeft = season ? daysBetween(today, season.endsOn) : 0;
  const daysToStart = season ? daysBetween(today, season.startsOn) : 0;

  const playerById = new Map(players.map((p) => [p.id, p]));
  const nextSession = sessions.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const attendees = nextSession
    ? signups
        .filter((s) => s.sessionId === nextSession.id)
        .flatMap((s) => {
          const p = playerById.get(s.playerId);
          return p ? [p] : [];
        })
    : [];

  // The latest few nights, each with every game played that day.
  const recentNights = [...new Set(games.map((g) => g.playedOn))]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 2)
    .map((date) => ({ date, games: games.filter((g) => g.playedOn === date) }));

  return (
    <div className="space-y-24">
      {/* Hero */}
      <Banner pattern="alliance" embers>
        <div className="grid items-center gap-8 py-12 sm:py-16 md:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="space-y-6">
            <h1 className="hero-in text-6xl leading-[1] font-bold sm:text-7xl lg:text-8xl">
              <span className="text-[#f2c868]">Root</span> League
            </h1>
            <p className="hero-in d2 max-w-[52ch] text-lg text-parchment/90 sm:text-xl">
              Root League is a bi-weekly competitive Root play group that meets Sundays at GEEK&apos;D Orlando. Check
              out the{" "}
              <Link
                href="/sessions"
                className="font-bold text-[#f2c868] underline decoration-[#f2c868]/50 decoration-2 underline-offset-4 hover:decoration-[#f2c868]"
              >
                game night page
              </Link>{" "}
              for more information!
            </p>
            <div className="hero-in d3 flex flex-wrap gap-3">
              {viewer ? (
                <>
                  <Link href="/sessions" className="btn acorn">Join a game night</Link>
                  <Link href="/account" className="btn secondary">My profile</Link>
                </>
              ) : (
                <>
                  <Link href="/signup" className="btn acorn">Join the league</Link>
                  <Link href="/leaderboard" className="btn secondary">See the standings</Link>
                </>
              )}
            </div>
            <dl className="hero-in d3 flex flex-wrap gap-x-8 gap-y-3 pt-2">
              <div>
                <dt className="text-sm text-parchment/70">Games played</dt>
                <dd className="font-display text-3xl font-bold tabular">{totals.games}</dd>
              </div>
              <div>
                <dt className="text-sm text-parchment/70">Players</dt>
                <dd className="font-display text-3xl font-bold tabular">{totals.players}</dd>
              </div>
              <div>
                <dt className="text-sm text-parchment/70">Game nights</dt>
                <dd className="font-display text-3xl font-bold tabular">{sessions.length}</dd>
              </div>
            </dl>
          </div>
          <div className="hero-art relative mx-auto w-full max-w-[340px] md:max-w-none">
            <div
              className="absolute inset-[8%] -z-10 rounded-full bg-[radial-gradient(circle,rgba(242,200,104,0.5),transparent_68%)]"
              aria-hidden="true"
            />
            <Image
              src="/art/hero.webp"
              alt="A rabbit, a fox and a mouse of the Woodland Alliance raise their banner"
              width={520}
              height={520}
              priority
              className="mx-auto h-auto w-full max-w-[460px] drop-shadow-[0_22px_28px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>
      </Banner>

      {/* Standings */}
      <section className="card p-5 sm:p-8">
        <SectionHeading
          title={
            <span className="flex items-center gap-3">
              <Trophy size={32} className="text-honey" aria-hidden="true" />
              {season ? season.label.split(" · ")[0] : "No season yet"}
            </span>
          }
          description={
            season && (
              <>
                <span className="font-semibold text-bark">{season.label.split(" · ")[1]}.</span>{" "}
                {phase === "live" &&
                  `${daysLeft === 0 ? "Final day!" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}. Most LP takes the prize pool.`}
                {phase === "upcoming" &&
                  `Starts in ${daysToStart} day${daysToStart === 1 ? "" : "s"}. Most LP takes the prize pool.`}
                {phase === "finished" && "Season complete. These are the final standings."}
              </>
            )
          }
          action={
            season && (
              <Link href={`/leaderboard?season=${season.number}`} className="chip">
                Full standings <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )
          }
        />

        {leaderboard.length === 0 ? (
          <p className="mt-8 rounded-2xl border-2 border-dashed border-bark/20 p-8 text-center text-bark-soft">
            No games yet this season. The first game night will put the first names on the board.
          </p>
        ) : (
          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Podium rows={leaderboard} players={players} />
            {leaderboard.length > 3 ? (
              <LeaderboardTable rows={leaderboard.slice(3, 8)} players={players} compact />
            ) : (
              <p className="rounded-2xl bg-parchment/70 p-6 text-bark-soft">
                Everyone on the board this season is on the podium. Join a game night to climb in.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Next game night + how points work */}
      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <section className="space-y-5">
          <SectionHeading
            title="Next game night"
            action={
              <Link href="/sessions" className="chip">
                All game nights <ArrowRight size={16} aria-hidden="true" />
              </Link>
            }
          />
          {nextSession ? (
            <SessionCard
              session={nextSession}
              attendees={attendees}
              state={rsvpStateFor(viewer, nextSession, signups, today)}
              featured
            />
          ) : (
            <p className="card p-6 text-bark-soft">Nothing is scheduled yet. Check back soon!</p>
          )}
        </section>

        <section className="card h-fit p-5 sm:p-8">
          <SectionHeading
            title="How points work"
            description={`Each game has ${PLAYERS_PER_GAME} players, and where you finish sets your league points. Play as many games as the night allows; every one counts toward your season.`}
          />
          <div className="mt-6">
            <LpScale />
          </div>
        </section>
      </div>

      {/* The war room */}
      <section className="band-war bleed py-20 sm:py-28">
        <Embers count={22} />
        <div className="shell grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-6">
            <h2 className="text-4xl leading-[1.05] font-bold sm:text-6xl">
              Every faction plays <span className="text-[#f2c868]">differently!</span>
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/players" className="btn acorn">Meet the warband</Link>
              <Link href="/factions" className="btn secondary">Pick a faction</Link>
            </div>
          </div>
          <CardFan cards={["frog", "talon", "throne", "knave", "vagabond", "mole", "quest"]} size="lg" alive />
        </div>
      </section>

      {/* Recent games, grouped by night so several tables on one night read as one event */}
      {recentNights.length > 0 && (
        <section className="space-y-8 pt-4">
          <SectionHeading
            title="Recent game nights"
            description={`${totals.games} games played by ${totals.players} players so far.`}
          />
          {recentNights.map((night) => (
            <div key={night.date} className="space-y-4">
              <h3 className="flex flex-wrap items-baseline gap-x-3 text-2xl font-bold">
                {formatDate(night.date, { weekday: "long" })}
                <span className="text-base font-semibold text-bark-soft">
                  {night.games.length} {night.games.length === 1 ? "game" : "games"}
                </span>
              </h3>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {night.games.map((g, i) => (
                  <li key={g.id} className="card p-5">
                    <p className="mb-3 text-sm font-bold tracking-wide text-bark-soft uppercase">
                      {night.games.length > 1 ? `Table ${i + 1}` : "Table"}
                    </p>
                    <ol className="space-y-2">
                      {[...g.results]
                        .sort((a, b) => a.placement - b.placement)
                        .map((r) => (
                          <li
                            key={r.playerId}
                            className={`flex items-center gap-3 rounded-xl px-2 py-1 ${r.placement === 1 ? "-mx-2 bg-honey/25 font-bold" : ""}`}
                          >
                            <span className="w-9 text-sm font-bold text-bark-soft">
                              {r.placement === 1 ? (
                                <Crown size={20} className="text-acorn-deep" aria-label="1st" />
                              ) : (
                                ordinal(r.placement)
                              )}
                            </span>
                            <FactionBadge faction={r.faction} size={30} />
                            <Link href={`/players/${r.playerId}`} className="font-semibold hover:text-moss-deep">
                              {playerById.get(r.playerId)?.name ?? "Unknown"}
                            </Link>
                          </li>
                        ))}
                    </ol>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Factions */}
      <section className="band-dark bleed py-14 sm:py-16">
        <div className="shell space-y-8">
          <SectionHeading
            onDark
            title={`The ${FACTIONS.length} factions`}
            description="Current League Faction Winrates"
            action={
              <Link href="/factions" className="chip !border-parchment/30 !bg-parchment/10 !text-parchment hover:!bg-parchment/20">
                Faction stats <ArrowRight size={16} aria-hidden="true" />
              </Link>
            }
          />
          <ul className="tilt-tiles grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {FACTIONS.map((f) => {
              const stat = factionStats.get(f.id);
              const style = { "--pattern": `url(${f.pattern})`, "--tint": f.color } as CSSProperties;
              return (
                <li key={f.id}>
                  <Link href="/factions" className="faction-tile h-full" style={style}>
                    <span className="faction-icon inline-flex w-fit"><FactionBadge faction={f.id} size={56} /></span>
                    <span className="mt-3 font-display text-lg leading-tight font-bold">{f.name}</span>
                    <span className="mt-0.5 text-sm text-parchment/85">
                      {stat && stat.games > 0
                        ? `${pct(stat.winrate)} wins · ${stat.games} ${stat.games === 1 ? "game" : "games"}`
                        : "No games yet"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
