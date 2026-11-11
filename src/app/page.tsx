import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { FactionBadge } from "@/components/FactionBadge";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { LpScale } from "@/components/LpScale";
import { Podium } from "@/components/Podium";
import { SessionCard } from "@/components/SessionCard";
import { getLeagueData } from "@/lib/data";
import { formatDate, ordinal } from "@/lib/format";
import { rsvpStateFor } from "@/lib/rsvp";
import { daysBetween, featuredSeason, seasonPhase, todayISO } from "@/lib/seasons";
import { buildLeaderboard, gamesInSeason, leagueTotals } from "@/lib/stats";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ players, games, sessions, seasons, signups }, viewer] = await Promise.all([getLeagueData(), getViewer()]);
  const today = todayISO();
  const season = featuredSeason(seasons, today);
  const phase = season ? seasonPhase(season, today) : undefined;
  const leaderboard = season ? buildLeaderboard(players, gamesInSeason(games, season)) : [];
  const totals = leagueTotals(games);
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

  const recent = [...games]
    .sort((a, b) => b.playedOn.localeCompare(a.playedOn) || b.id.localeCompare(a.id))
    .slice(0, 4);

  const heroStyle = { "--pattern": "url(/patterns/alliance.webp)" } as CSSProperties;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-[2rem] border-[1.5px] border-bark/15 bg-parchment-deep/80 shadow-[var(--shadow-card)]"
        style={heroStyle}
      >
        <div className="pattern-fade pattern-hero" aria-hidden="true" />
        <div className="relative grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <Image
              src="/brand/root-logo.webp"
              alt="Root: a game of woodland might and right"
              width={1000}
              height={324}
              priority
              className="hero-in w-full max-w-[400px] rounded-xl shadow-[0_10px_24px_-10px_rgba(75,52,38,0.5)]"
            />
            <h1 className="hero-in d1 text-4xl leading-[1.05] font-bold sm:text-5xl">Orlando&apos;s live Root league</h1>
            <p className="hero-in d2 max-w-[48ch] text-lg text-bark">
              Four players, one board, one season-long race. Join a game night, climb the leaderboard and chase the
              prize pool. New to Root? You&apos;re welcome at the table.
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
          <div className="hero-art mx-auto w-full max-w-[340px] md:max-w-none">
            <Image
              src="/art/hero.webp"
              alt="A rabbit, a fox and a mouse of the Woodland Alliance raise their banner"
              width={520}
              height={520}
              priority
              className="h-auto w-full drop-shadow-[0_18px_24px_rgba(75,52,38,0.35)]"
            />
          </div>
        </div>
      </section>

      {/* Standings */}
      <section className="card p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-3xl font-bold">
              <Trophy size={28} className="text-honey" aria-hidden="true" />
              {season ? season.label.split(" · ")[0] : "No season yet"}
            </h2>
            {season && (
              <p className="mt-1 text-bark-soft">
                <span className="font-semibold text-bark">{season.label.split(" · ")[1]}.</span>{" "}
                {phase === "live" &&
                  `${daysLeft === 0 ? "Final day!" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}. Most LP takes the prize pool.`}
                {phase === "upcoming" &&
                  `Starts in ${daysToStart} day${daysToStart === 1 ? "" : "s"}. Most LP takes the prize pool.`}
                {phase === "finished" && "Season complete. These are the final standings."}
              </p>
            )}
          </div>
          {season && (
            <Link href={`/leaderboard?season=${season.number}`} className="chip">
              Full standings <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>

        {leaderboard.length === 0 ? (
          <p className="mt-6 rounded-2xl border-2 border-dashed border-bark/20 p-6 text-center text-bark-soft">
            No games yet this season. The first game night will put the first names on the board.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <Podium rows={leaderboard} players={players} />
            {leaderboard.length > 3 && (
              <LeaderboardTable rows={leaderboard.slice(3, 8)} players={players} compact />
            )}
          </div>
        )}
      </section>

      {/* Next game night + how it works */}
      <div className="grid gap-6 md:grid-cols-5">
        <section className="space-y-3 md:col-span-3">
          <h2 className="text-3xl font-bold">Next game night</h2>
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
          <Link href="/sessions" className="chip">
            All game nights <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>

        <section className="card p-5 sm:p-6 md:col-span-2">
          <h2 className="text-2xl font-bold">How points work</h2>
          <p className="mt-1 mb-4 text-bark-soft">Every game seats four. Where you finish sets your league points.</p>
          <LpScale />
        </section>
      </div>

      {/* Recent games */}
      {recent.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-3xl font-bold">Recent games</h2>
            <p className="text-bark-soft">
              {totals.games} games played by {totals.players} players so far.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {recent.map((g) => (
              <li key={g.id} className="card p-4">
                <p className="mb-2 text-sm font-bold text-bark-soft">{formatDate(g.playedOn)}</p>
                <ol className="space-y-1.5">
                  {[...g.results]
                    .sort((a, b) => a.placement - b.placement)
                    .map((r) => (
                      <li key={r.playerId} className="flex items-center gap-2.5">
                        <span className="w-9 text-sm font-bold text-bark-soft">{ordinal(r.placement)}</span>
                        <FactionBadge faction={r.faction} size={28} />
                        <Link href={`/players/${r.playerId}`} className="font-semibold hover:text-moss-deep">
                          {playerById.get(r.playerId)?.name ?? "Unknown"}
                        </Link>
                      </li>
                    ))}
                </ol>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
