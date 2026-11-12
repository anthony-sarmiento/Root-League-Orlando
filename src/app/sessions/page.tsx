import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Crown } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { FactionBadge } from "@/components/FactionBadge";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { SessionCard } from "@/components/SessionCard";
import { getLeagueData } from "@/lib/data";
import { formatDate, ordinal } from "@/lib/format";
import type { Game } from "@/lib/league";
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
  const [next, ...later] = upcoming;
  const past = sessions.filter((s) => s.date < today).sort((a, b) => b.date.localeCompare(a.date));

  /** The distinct rounds played in a set of tables, in order. */
  const roundsOf = (gs: Game[]) => [...new Set(gs.map((g) => g.round))].sort((a, b) => a - b);
  const winnerOf = (g: Game) => g.results.find((r) => r.placement === 1);

  return (
    <div className="space-y-12">
      <PageHeader
        title="Game nights"
        pattern="riverfolk"
        crew={[{ id: "skipper-audgunn", w: 150 }, { id: "captain-hersilia", w: 160 }, { id: "thief", w: 140, f: -1 }]}
        description="Root League meets every other Sunday at GEEK'D Orlando. Several tables play at once, each seating four, and you can play as many games as the night allows. RSVP ahead so organizers can plan the tables."
      />

      <section className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:px-7">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold">Played a table that isn&apos;t on the board?</h2>
          <p className="text-bark-soft">Report it yourself. An organizer approves it before it counts.</p>
        </div>
        <Link href="/report" className="btn acorn">Report a game</Link>
      </section>

      <section className="space-y-5">
        <SectionHeading onDark title="Next game night" />
        {next ? (
          <SessionCard session={next} attendees={attendeesOf(next.id)} state={rsvpStateFor(viewer, next, signups, today)} featured />
        ) : (
          <p className="card p-6 text-bark-soft">No game nights are on the calendar yet. Check back soon!</p>
        )}
      </section>

      {later.length > 0 && (
        <section className="space-y-5">
          <SectionHeading onDark title="Coming up" />
          <ul className="grid gap-5 lg:grid-cols-2">
            {later.map((s) => (
              <li key={s.id}>
                <SessionCard session={s} attendees={attendeesOf(s.id)} state={rsvpStateFor(viewer, s, signups, today)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-6">
        <SectionHeading onDark title="Past nights" description="Who took each table, night by night." />
        {past.length === 0 && <p className="card p-6 text-bark-soft">No game nights have been played yet.</p>}
        <ol className="relative space-y-4 border-l-2 border-dashed border-parchment/30 pl-6 sm:pl-8">
          {past.map((s) => {
            const sessionGames = games.filter((g) => g.sessionId === s.id);
            return (
              <li key={s.id} className="relative">
                <span
                  className="absolute top-6 -left-[2.1rem] h-4 w-4 rounded-full border-[3px] border-[#2a2217] bg-honey sm:-left-[2.6rem]"
                  aria-hidden="true"
                />
                <details className="card lift-card group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4 sm:px-6">
                    <span className="min-w-0">
                      <span className="block font-title text-xl font-bold">{formatDate(s.date, { weekday: "long" })}</span>
                      <span className="text-sm text-bark-soft">
                        {sessionGames.length} {sessionGames.length === 1 ? "table" : "tables"}
                        {roundsOf(sessionGames).length > 1 && ` · ${roundsOf(sessionGames).length} rounds`}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      {sessionGames.length > 0 && (
                        <span className="flex items-center -space-x-2" aria-label="Table winners">
                          {sessionGames.map((g) => {
                            const w = winnerOf(g);
                            const p = w && playerById.get(w.playerId);
                            return p ? (
                              <span key={g.id} className="rounded-full ring-2 ring-paper" title={`${p.name} won`}>
                                <Avatar name={p.name} avatar={p.avatar} bg={p.avatarBg} crop={p.avatarCrop} size={36} />
                              </span>
                            ) : null;
                          })}
                        </span>
                      )}
                      <ChevronDown size={20} className="transition-transform group-open:rotate-180" aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="space-y-5 border-t-2 border-dashed border-bark/15 p-4 sm:px-6">
                    {sessionGames.length === 0 && <p className="text-bark-soft">No results were logged for this night.</p>}
                    {roundsOf(sessionGames).map((round) => (
                      <div key={round} className="space-y-3">
                        {roundsOf(sessionGames).length > 1 && <h4 className="text-xl font-bold">Round {round}</h4>}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {sessionGames
                            .filter((g) => g.round === round)
                            .map((g, i) => (
                              <div key={g.id} className="rounded-xl bg-parchment/70 p-3">
                                <p className="mb-2 text-xs font-bold tracking-wide text-bark-soft uppercase">
                                  Table {i + 1}
                                  {g.results.length === 3 && <span className="ml-2 font-semibold normal-case">3 players</span>}
                                </p>
                                <ol className="space-y-1.5">
                                  {[...g.results]
                                    .sort((a, b) => a.placement - b.placement)
                                    .map((r) => (
                                      <li key={r.playerId} className="flex items-center gap-2.5">
                                        <span className="w-9 text-sm font-bold text-bark-soft">
                                          {r.placement === 1 ? (
                                            <Crown size={18} className="text-honey" aria-label="1st" />
                                          ) : (
                                            ordinal(r.placement)
                                          )}
                                        </span>
                                        <FactionBadge faction={r.faction} size={28} />
                                        <Link href={`/players/${r.playerId}`} className="font-semibold hover:text-moss-deep">
                                          {playerById.get(r.playerId)?.name ?? "Unknown"}
                                        </Link>
                                      </li>
                                    ))}
                                </ol>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
