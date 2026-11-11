import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { FactionBadge } from "@/components/FactionBadge";
import { PageHeader } from "@/components/PageHeader";
import { SessionCard } from "@/components/SessionCard";
import { getLeagueData } from "@/lib/data";
import { formatDate, ordinal } from "@/lib/format";
import { rsvpStateFor } from "@/lib/rsvp";
import { todayISO } from "@/lib/seasons";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Game nights" };
export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const [{ sessions, games, players, signups }, viewer] = await Promise.all([getLeagueData(), getViewer()]);
  const today = todayISO();
  const playerById = new Map(players.map((p) => [p.id, p]));

  const attendeesOf = (sessionId: string) =>
    signups
      .filter((s) => s.sessionId === sessionId)
      .flatMap((s) => {
        const p = playerById.get(s.playerId);
        return p ? [p] : [];
      });

  const upcoming = sessions.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = sessions.filter((s) => s.date < today).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-10">
      <PageHeader
        title="Game nights"
        pattern="riverfolk"
        description="Live Root sessions in Orlando. Join a night ahead of time so organizers can seat tables of four."
      />

      <section className="space-y-4">
        <h2 className="text-3xl font-bold">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="card p-6 text-bark-soft">No game nights are on the calendar yet. Check back soon!</p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {upcoming.map((s, i) => (
              <li key={s.id}>
                <SessionCard
                  session={s}
                  attendees={attendeesOf(s.id)}
                  state={rsvpStateFor(viewer, s, signups, today)}
                  featured={i === 0}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl font-bold">Past nights</h2>
        {past.length === 0 && <p className="card p-6 text-bark-soft">No game nights have been played yet.</p>}
        <ul className="space-y-3">
          {past.map((s) => {
            const sessionGames = games.filter((g) => g.sessionId === s.id);
            return (
              <li key={s.id}>
                <details className="card group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:px-6">
                    <span>
                      <span className="font-display text-xl font-bold">{formatDate(s.date, { weekday: "long" })}</span>
                      <span className="ml-3 text-sm text-bark-soft">
                        {sessionGames.length} {sessionGames.length === 1 ? "game" : "games"}
                      </span>
                    </span>
                    <ChevronDown size={20} className="transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="grid gap-3 border-t-2 border-dashed border-bark/15 p-4 sm:grid-cols-2 sm:px-6">
                    {sessionGames.length === 0 && <p className="text-bark-soft">No results were logged for this night.</p>}
                    {sessionGames.map((g) => (
                      <ol key={g.id} className="space-y-1.5 rounded-xl bg-parchment/70 p-3">
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
                    ))}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
