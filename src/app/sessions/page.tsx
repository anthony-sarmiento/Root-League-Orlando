import type { Metadata } from "next";
import Link from "next/link";
import { FactionBadge } from "@/components/FactionBadge";
import { getLeagueData } from "@/lib/data";
import { formatDate, ordinal } from "@/lib/format";
import { todayISO } from "@/lib/seasons";

export const metadata: Metadata = { title: "Game nights" };
export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const { sessions, games, players } = await getLeagueData();
  const today = todayISO();
  const playerName = new Map(players.map((p) => [p.id, p.name]));

  const upcoming = sessions.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = sessions.filter((s) => s.date < today).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold">Game nights</h1>
        <p className="mt-1 text-bark-soft">Live Root sessions, past and upcoming.</p>
      </header>

      <section>
        <h2 className="mb-3 text-2xl font-bold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="card p-5 text-bark-soft">No game nights on the calendar yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((s) => (
              <li key={s.id} className="card stitched p-5">
                <p className="font-display text-2xl font-bold text-moss-deep">
                  {formatDate(s.date, { weekday: "long", month: "long", day: "numeric", year: undefined })}
                </p>
                <p className="text-bark-soft">{s.title} · {s.location}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-bold">Past nights</h2>
        <ul className="space-y-4">
          {past.map((s) => {
            const sessionGames = games.filter((g) => g.sessionId === s.id);
            return (
              <li key={s.id} className="card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-xl font-bold">{formatDate(s.date, { weekday: "long" })}</h3>
                  <p className="text-sm text-bark-soft">{s.title} · {sessionGames.length} games</p>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {sessionGames.map((g) => (
                    <ol key={g.id} className="space-y-1 rounded-xl bg-parchment/70 p-3">
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
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
