import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Crown, Trophy } from "lucide-react";
import { Banner } from "@/components/Banner";
import { BannerArt, Embers, Perch } from "@/components/Critters";
import { FactionBadge } from "@/components/FactionBadge";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { LpScale } from "@/components/LpScale";
import { Podium } from "@/components/Podium";
import { SectionHeading } from "@/components/SectionHeading";
import { SessionCard } from "@/components/SessionCard";
import { FACTION_CRITTER, critterSrc } from "@/lib/critters";
import { getLeagueData } from "@/lib/data";
import { formatDate, ordinal, pct } from "@/lib/format";
import { FACTIONS, PLAYERS_PER_GAME } from "@/lib/league";
import { rsvpStateFor } from "@/lib/rsvp";
import { daysBetween, featuredSeason, seasonPhase, todayISO } from "@/lib/seasons";
import { buildFactionStats, buildLeaderboard, gamesInSeason, leagueTotals } from "@/lib/stats";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
/** Small numbers in words: the title face draws its digits in an old-style that can read oddly in a heading. */
const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

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
    .map((date) => {
      const nightGames = games.filter((g) => g.playedOn === date);
      return { date, games: nightGames, rounds: [...new Set(nightGames.map((g) => g.round))].sort((a, b) => a - b) };
    });

  return (
    <div className="space-y-24">
      {/* Hero */}
      <Banner pattern="alliance" embers>
        <div className="grid gap-6 pt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] md:items-stretch lg:pt-14">
          <div className="flex flex-col justify-between gap-10 pb-10 md:pb-14">
            <div className="space-y-6">
              <h1 className="hero-in text-5xl sm:text-6xl xl:text-7xl 2xl:text-8xl">
                <span className="text-[#f2c868]">Root</span> League
              </h1>
              <p className="hero-in d2 max-w-[46ch] text-lg text-parchment/90 sm:text-xl">
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
            </div>
            <dl className="hero-in d3 grid grid-cols-3 divide-x divide-parchment/20 rounded-3xl border border-parchment/20 bg-black/25 py-7 text-center shadow-[0_18px_30px_-16px_rgba(0,0,0,0.65)] sm:py-9">
              {[
                { label: "Games played", value: totals.games },
                { label: "Players", value: totals.players },
                { label: "Game nights", value: sessions.length },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse items-center gap-2 px-2">
                  <dt className="text-xs font-semibold tracking-[0.08em] text-parchment/75 uppercase sm:text-sm">{stat.label}</dt>
                  <dd className="font-display text-6xl leading-none font-bold tabular text-[#f2c868] sm:text-7xl">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="hero-art relative mx-auto flex w-full max-w-[420px] items-end justify-center md:max-w-none">
            <div
              className="absolute inset-[2%] -z-10 rounded-full bg-[radial-gradient(circle,rgba(242,200,104,0.5),transparent_68%)]"
              aria-hidden="true"
            />
            <Image
              src="/art/hero.webp"
              alt="A rabbit, a fox and a mouse of the Woodland Alliance raise their banner"
              width={520}
              height={520}
              priority
              className="h-auto w-full max-w-[640px] drop-shadow-[0_22px_28px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>
      </Banner>

      {/* Standings */}
      <section className="card relative p-5 sm:p-8">
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
            onDark
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

        <section className="card relative h-fit p-5 sm:p-8">
          <Perch id="sergeant-atheldrydd" w={96} right="2.5rem" />
          <SectionHeading
            title="How points work"
            description={`A table seats ${PLAYERS_PER_GAME} players, sometimes 3, and where you finish sets your league points. A night can run a round or two and several tables at once; every table you play counts toward your season.`}
          />
          <div className="mt-6">
            <LpScale />
          </div>
        </section>
      </div>

      {/* The brawl */}
      <section className="glow" style={{ "--glow": "radial-gradient(60% 55% at 50% 72%, rgba(240, 140, 50, 0.38), transparent 70%)" } as CSSProperties}>
        <Embers count={22} />
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h2 className="text-5xl font-bold sm:text-7xl">
            <span className="text-[#f2c868]">GEEK&apos;D</span> ROOT LEAGUE
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/players" className="btn acorn">Meet the Players</Link>
            <Link href="/factions" className="btn secondary">Pick a faction</Link>
          </div>
        </div>
        <div className="bleed mt-8">
          <BannerArt />
        </div>
      </section>

      {/* Factions */}
      <section className="space-y-10">
        <SectionHeading
          onDark
          title={`The ${numberWord(FACTIONS.length)} factions`}
          description="Current League Faction Winrates"
          action={
            <Link href="/factions" className="btn acorn big">
              View all factions <ArrowRight size={22} aria-hidden="true" />
            </Link>
          }
        />
        <ul className="tilt-tiles grid grid-cols-2 gap-x-3 gap-y-20 pt-12 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-5">
          {FACTIONS.map((f, i) => {
            const stat = factionStats.get(f.id);
            const style = { "--pattern": `url(${f.pattern})`, "--tint": f.color } as CSSProperties;
            return (
              <li key={f.id}>
                <Link href={`/factions/${f.id}`} className="faction-tile h-full" style={style}>
                  <span className="tile-bg" aria-hidden="true" />
                  <span className="tile-critter" style={{ "--r": `${[-7, 6, -4, 8, -6][i % 5]}deg` } as CSSProperties} aria-hidden="true">
                    <Image src={critterSrc(FACTION_CRITTER[f.id])} alt="" width={320} height={320} className="h-32 w-auto" />
                  </span>
                  <span className="faction-icon inline-flex w-fit"><FactionBadge faction={f.id} size={56} /></span>
                  <span className="mt-3 font-title text-xl leading-tight font-bold">{f.name}</span>
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
      </section>

      {/* Recent games, grouped by night so several tables on one night read as one event */}
      {recentNights.length > 0 && (
        <section className="space-y-8">
          <SectionHeading
            onDark
            title="Recent game nights"
            description={`${totals.games} games played by ${totals.players} players so far.`}
          />
          {recentNights.map((night) => (
            <div key={night.date} className="space-y-4">
              <h3 className="flex flex-wrap items-baseline gap-x-3 text-2xl font-bold">
                {formatDate(night.date, { weekday: "long" })}
                <span className="text-base font-semibold text-parchment/70">
                  {night.games.length} {night.games.length === 1 ? "table" : "tables"}
                  {night.rounds.length > 1 && ` · ${night.rounds.length} rounds`}
                </span>
              </h3>
              {night.rounds.map((round) => (
                <div key={round} className="space-y-3">
                  {night.rounds.length > 1 && <h4 className="text-xl font-bold text-parchment/90">Round {round}</h4>}
                  <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {night.games
                      .filter((g) => g.round === round)
                      .map((g, i) => (
                        <li key={g.id} className="card p-5">
                          <p className="mb-3 text-sm font-bold tracking-wide text-bark-soft uppercase">
                            Table {i + 1}
                            {g.results.length === 3 && <span className="ml-2 font-semibold normal-case">3 players</span>}
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
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
