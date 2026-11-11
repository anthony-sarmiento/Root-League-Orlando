import Link from "next/link";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { FactionBadge } from "@/components/FactionBadge";
import { getLeagueData } from "@/lib/data";
import { formatDate, ordinal } from "@/lib/format";
import { getFaction } from "@/lib/league";
import { currentSeason, daysBetween, todayISO } from "@/lib/seasons";
import { buildFactionStats, buildLeaderboard, gamesInSeason, leagueTotals } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { players, games, sessions } = await getLeagueData();
  const today = todayISO();
  const season = currentSeason(today);
  const seasonGames = gamesInSeason(games, season);
  const leaderboard = buildLeaderboard(players, seasonGames);
  const totals = leagueTotals(games);
  const daysLeft = daysBetween(today, season.endsOn);

  const nextSession = sessions
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const recent = [...games]
    .sort((a, b) => b.playedOn.localeCompare(a.playedOn) || b.id.localeCompare(a.id))
    .slice(0, 4);
  const playerName = new Map(players.map((p) => [p.id, p.name]));

  const topFaction = buildFactionStats(players, games).find((f) => f.games >= 5);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="card stitched px-6 py-10 text-center sm:px-12">
        <p className="text-4xl" aria-hidden="true">🍂🌰🍄</p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Welcome to the clearing</h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-bark-soft">
          Orlando&apos;s live <strong>Root</strong> league. Gather your warriors, climb the
          leaderboard, and claim the season&apos;s prize pool.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/leaderboard" className="chip active text-base">View leaderboard</Link>
          <Link href="/sessions" className="chip text-base">Game nights</Link>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Season standings */}
        <section className="card md:col-span-3">
          <div className="flex flex-wrap items-end justify-between gap-2 p-5 pb-2">
            <div>
              <h2 className="text-2xl font-bold">{season.label}</h2>
              <p className="text-sm text-bark-soft">
                {daysLeft > 0
                  ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                  : daysLeft === 0
                    ? "Final day!"
                    : "Season over"}{" "}
                · most LP takes the prize pool 🏆
              </p>
            </div>
            <Link href={`/leaderboard?season=${season.number}`} className="chip">Full standings →</Link>
          </div>
          <LeaderboardTable rows={leaderboard.slice(0, 5)} compact />
        </section>

        <div className="space-y-6 md:col-span-2">
          {/* Next session */}
          <section className="card stitched p-5">
            <h2 className="text-xl font-bold">Next game night</h2>
            {nextSession ? (
              <>
                <p className="mt-2 font-display text-2xl font-bold text-moss-deep">
                  {formatDate(nextSession.date, { weekday: "long", month: "long", day: "numeric", year: undefined })}
                </p>
                <p className="text-bark-soft">{nextSession.title} · {nextSession.location}</p>
              </>
            ) : (
              <p className="mt-2 text-bark-soft">Nothing scheduled yet. Check back soon!</p>
            )}
          </section>

          {/* League at a glance */}
          <section className="card p-5">
            <h2 className="text-xl font-bold">League at a glance</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-parchment p-3">
                <dt className="text-xs font-bold uppercase tracking-wider text-bark-soft">Games played</dt>
                <dd className="font-display text-3xl font-bold">{totals.games}</dd>
              </div>
              <div className="rounded-xl bg-parchment p-3">
                <dt className="text-xs font-bold uppercase tracking-wider text-bark-soft">Players</dt>
                <dd className="font-display text-3xl font-bold">{totals.players}</dd>
              </div>
            </dl>
            {topFaction && (
              <p className="mt-3 flex items-center gap-2 text-sm">
                <FactionBadge faction={topFaction.faction} size={28} />
                <span>
                  <strong>{getFaction(topFaction.faction).name}</strong> has the best win rate so far.
                </span>
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Recent games */}
      <section className="card p-5">
        <h2 className="text-2xl font-bold">Recent games</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {recent.map((g) => (
            <li key={g.id} className="rounded-xl border-2 border-dashed border-bark/15 bg-parchment/60 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-bark-soft">{formatDate(g.playedOn)}</p>
              <ol className="mt-2 space-y-1">
                {[...g.results]
                  .sort((a, b) => a.placement - b.placement)
                  .map((r) => (
                    <li key={r.playerId} className="flex items-center gap-2">
                      <span className="w-8 text-sm font-bold text-bark-soft">{ordinal(r.placement)}</span>
                      <FactionBadge faction={r.faction} size={24} />
                      <Link href={`/players/${r.playerId}`} className="font-semibold hover:text-moss-deep">
                        {playerName.get(r.playerId) ?? "Unknown"}
                      </Link>
                    </li>
                  ))}
              </ol>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
