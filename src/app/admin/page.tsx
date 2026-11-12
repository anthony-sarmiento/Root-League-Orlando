import type { Metadata } from "next";
import { AddPlayerForm, AddSessionForm } from "@/components/admin/SimpleForms";
import { ClaimActions, SeasonForm } from "@/components/admin/SeasonAndClaimForms";
import { PageHeader } from "@/components/PageHeader";
import { LogGameForm } from "@/components/admin/LogGameForm";
import { AccountConnector, MergePlayersForm, type AccountRow } from "@/components/admin/AccountConnector";
import { RevealEmail } from "@/components/admin/RevealEmail";
import { maskEmail } from "@/lib/email";
import { NightManager } from "@/components/admin/NightManager";
import { ReportQueue } from "@/components/admin/ReportQueue";
import { PlayerManager } from "@/components/admin/PlayerManager";
import { signOut } from "@/app/login/actions";
import { getAdminContext } from "@/lib/admin";
import { getLeagueData } from "@/lib/data";
import { looksLikeDuplicate } from "@/lib/game-report";
import { fetchPendingReports } from "@/lib/reports";
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

  const { user, isAdmin, supabase } = await getAdminContext();

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

  const { players, sessions, games, seasons } = await getLeagueData();
  const today = todayISO();

  // Every account with the name it is connected to (organizers only; absent until the connect migration is run).
  // The full emails stay on the server: the page only gets masked ones, and an organizer asks to see one at a time.
  const { data: accountRows } = await supabase.rpc("list_accounts");
  const rawAccounts = Array.isArray(accountRows)
    ? (accountRows as { user_id: string; email: string; created_at: string; player_id: string | null; player_name: string | null }[])
    : null;
  const accounts: AccountRow[] | null = rawAccounts
    ? rawAccounts.map((a) => ({
        userId: a.user_id,
        emailMasked: maskEmail(a.email),
        createdAt: a.created_at,
        playerId: a.player_id,
        playerName: a.player_name,
      }))
    : null;
  const maskedByUser = new Map((accounts ?? []).map((a) => [a.userId, a.emailMasked]));

  // Open requests from people who say an existing name is theirs.
  const { data: claimRows } = await supabase
    .from("player_claims")
    .select("user_id, note, created_at, players(name)")
    .order("created_at");
  const claims = (claimRows ?? []).map((c) => {
    const joined = c.players as { name: string } | { name: string }[] | null;
    const name = Array.isArray(joined) ? joined[0]?.name : joined?.name;
    const userId = c.user_id as string;
    return { userId, emailMasked: maskedByUser.get(userId) ?? "", note: c.note as string | null, playerName: name ?? "Unknown" };
  });
  const { reports: pendingReports } = await fetchPendingReports(supabase);
  const queued = pendingReports.map((report) => ({ report, duplicate: looksLikeDuplicate(report, games) }));
  const gamesByPlayer = new Map<string, number>();
  for (const g of games) for (const r of g.results) gamesByPlayer.set(r.playerId, (gamesByPlayer.get(r.playerId) ?? 0) + 1);
  const managedPlayers = players.map((p) => ({ id: p.id, name: p.name, games: gamesByPlayer.get(p.id) ?? 0 }));
  const nextSeasonNumber = Math.max(0, ...seasons.map((x) => x.number)) + 1;
  const sessionsNewestFirst = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <PageHeader title="Organizer tools" pattern="duchy" description={`Signed in as ${user.email}`}>
        <form action={signOut}>
          <button className="btn secondary small">Sign out</button>
        </form>
      </PageHeader>

      {queued.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-1 text-2xl font-bold">
            Reports waiting for approval <span className="text-acorn-deep">({queued.length})</span>
          </h2>
          <p className="mb-4 text-bark-soft">
            Players reported these tables themselves. Nothing counts toward the standings until you approve it. Review
            to fix any mistake, then approve.
          </p>
          <ReportQueue items={queued} players={players} sessions={sessionsNewestFirst} today={today} />
        </section>
      )}

      {claims.length > 0 && (
        <section className="card stitched p-5">
          <h2 className="mb-1 text-2xl font-bold">Name claims waiting for you</h2>
          <p className="mb-3 text-bark-soft">
            Approve only if you know this person is who they say they are. Approving gives them that player&apos;s games and points.
            If they already made a profile of their own, it is merged into the name they claimed.
          </p>
          <ul className="divide-y-2 divide-dashed divide-bark/15">
            {claims.map((c) => (
              <li key={c.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p>
                    <RevealEmail userId={c.userId} masked={c.emailMasked} /> wants to be <strong>{c.playerName}</strong>
                  </p>
                  {c.note && <p className="text-sm text-bark-soft">“{c.note}”</p>}
                </div>
                <ClaimActions userId={c.userId} playerName={c.playerName} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-1 text-2xl font-bold">Log a table</h2>
        <p className="mb-3 text-bark-soft">
          A table seats 3 or 4 players. Pick the night and round, then add each table as it finishes: a night can have
          several tables in each round. Fix or delete any table further down.
        </p>
        {players.length < 3 ? (
          <p className="text-bark-soft">Add at least three players below before logging a table.</p>
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

      {accounts && (
        <section className="card p-5">
          <h2 className="mb-1 text-2xl font-bold">Connect accounts to names</h2>
          <p className="mb-4 max-w-[75ch] text-bark-soft">
            For someone who made a second account, or a fresh profile next to a name you already had. Pick their account
            and the name they really are. If the account has its own profile, it is merged into that name: games, RSVPs
            and reports move over and the duplicate goes away. If the name already has an account, this one is added
            alongside it, so both logins work.
          </p>
          <AccountConnector accounts={accounts} players={managedPlayers} />
          <div className="mt-6 border-t-2 border-dashed border-bark/20 pt-5">
            <h3 className="mb-1 text-xl font-bold">Merge two names</h3>
            <p className="mb-4 max-w-[75ch] text-bark-soft">
              Two names that are really one person, even with no account involved (for example &ldquo;Bram&rdquo; and
              &ldquo;Bramble&rdquo;). Two people who sat at the same table can&apos;t be merged.
            </p>
            <MergePlayersForm players={managedPlayers} />
          </div>
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-1 text-2xl font-bold">Players</h2>
        <p className="mb-4 text-bark-soft">
          Fix a name or remove someone who joined by mistake. A player with games on record can be renamed, but to remove
          them delete their games first (under Recent games).
        </p>
        <PlayerManager players={managedPlayers} />
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-2xl font-bold">Seasons</h2>
        <p className="mb-4 text-bark-soft">
          Seasons can run any dates, but they can&apos;t overlap. A game counts towards the season it was played in.
        </p>
        <div className="space-y-4">
          {[...seasons].reverse().map((x) => (
            <SeasonForm key={`${x.number}-${x.startsOn}-${x.endsOn}`} number={x.number} startsOn={x.startsOn} endsOn={x.endsOn} />
          ))}
          <div className="border-t-2 border-dashed border-bark/15 pt-4">
            <SeasonForm number={nextSeasonNumber} startsOn="" endsOn="" isNew />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold">Game nights and tables</h2>
          <p className="mt-1 text-parchment/80">
            Open a night to change its details, add rounds, add tables, and edit or delete any table.
          </p>
        </div>
        <NightManager players={players} sessions={sessionsNewestFirst} games={games} today={today} />
      </section>
    </div>
  );
}
