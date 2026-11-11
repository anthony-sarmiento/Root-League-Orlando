import type { Metadata } from "next";
import { AddPlayerForm, AddSessionForm, DeleteGameForm } from "@/components/admin/SimpleForms";
import { LogGameForm } from "@/components/admin/LogGameForm";
import { signOut } from "@/app/login/actions";
import { getAdminContext } from "@/lib/admin";
import { getLeagueData } from "@/lib/data";
import { formatDate, ordinal } from "@/lib/format";
import { getFaction } from "@/lib/league";
import { todayISO } from "@/lib/seasons";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Organizer tools" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="card stitched mx-auto max-w-xl p-6">
        <h1 className="text-3xl font-bold">Organizer tools</h1>
        <p className="mt-2 text-bark-soft">
          Logging games needs the league database. Connect Supabase (steps are in the README) and
          this page will let organizers record results, add players and schedule game nights.
        </p>
      </div>
    );
  }

  const { user, isAdmin } = await getAdminContext();

  if (!isAdmin) {
    return (
      <div className="card stitched mx-auto max-w-xl space-y-3 p-6">
        <h1 className="text-3xl font-bold">Not an organizer yet</h1>
        <p className="text-bark-soft">
          You&apos;re signed in as <strong>{user.email}</strong>, but this account isn&apos;t on the
          organizer list. Ask an existing organizer to add this user id to the <code>admins</code> table:
        </p>
        <p className="rounded-xl bg-parchment p-3 font-mono text-sm break-all">{user.id}</p>
        <form action={signOut}>
          <button className="btn secondary">Sign out</button>
        </form>
      </div>
    );
  }

  const { players, sessions, games } = await getLeagueData();
  const today = todayISO();
  const playerName = new Map(players.map((p) => [p.id, p.name]));
  const recent = [...games]
    .sort((a, b) => b.playedOn.localeCompare(a.playedOn) || b.id.localeCompare(a.id))
    .slice(0, 10);
  const sessionsNewestFirst = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold">Organizer tools</h1>
          <p className="text-bark-soft">Signed in as {user.email}</p>
        </div>
        <form action={signOut}>
          <button className="btn secondary">Sign out</button>
        </form>
      </header>

      <section className="card stitched p-5">
        <h2 className="mb-3 text-2xl font-bold">Log a game</h2>
        {players.length < 4 ? (
          <p className="text-bark-soft">Add at least four players below before logging a game.</p>
        ) : (
          <LogGameForm players={players} sessions={sessionsNewestFirst} today={today} />
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-2xl font-bold">Add a player</h2>
          <AddPlayerForm />
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-2xl font-bold">Schedule a game night</h2>
          <AddSessionForm today={today} />
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-2xl font-bold">Recent games</h2>
        {recent.length === 0 ? (
          <p className="text-bark-soft">No games logged yet.</p>
        ) : (
          <ul className="divide-y-2 divide-dashed divide-bark/15">
            {recent.map((g) => {
              const ordered = [...g.results].sort((a, b) => a.placement - b.placement);
              const summary = `${formatDate(g.playedOn)}: ${ordered
                .map((r) => `${ordinal(r.placement)} ${playerName.get(r.playerId) ?? "?"}`)
                .join(", ")}`;
              return (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-xs font-bold tracking-wider text-bark-soft uppercase">
                      {formatDate(g.playedOn)}
                    </p>
                    <p>
                      {ordered.map((r, i) => (
                        <span key={r.playerId}>
                          {i > 0 && " · "}
                          <strong>{ordinal(r.placement)}</strong> {playerName.get(r.playerId) ?? "?"}{" "}
                          <span className="text-bark-soft">({getFaction(r.faction).name})</span>
                        </span>
                      ))}
                    </p>
                  </div>
                  <DeleteGameForm gameId={g.id} summary={summary} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
