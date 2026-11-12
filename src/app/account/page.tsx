import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { ClaimForm } from "@/components/account/ClaimForm";
import { DeleteAccountForm } from "@/components/account/DeleteAccountForm";
import { ProfileForm } from "@/components/account/ProfileForm";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { SessionCard } from "@/components/SessionCard";
import { getLeagueData } from "@/lib/data";
import { rsvpStateFor } from "@/lib/rsvp";
import { todayISO } from "@/lib/seasons";
import { createServerSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const { players, sessions, signups, games } = await getLeagueData();
  const today = todayISO();
  const me = viewer.player;
  const playerById = new Map(players.map((p) => [p.id, p]));

  // Names that already belong to an account can't be claimed, and neither can your own.
  const supabase = await createServerSupabase();
  const { data: claimedIds } = await supabase.rpc("claimed_player_ids");
  const claimed = new Set<string>((claimedIds as string[] | null) ?? []);
  const unclaimed = players.filter((p) => !claimed.has(p.id) && p.id !== me?.id);

  const gamesPlayed = me ? games.filter((g) => g.results.some((r) => r.playerId === me.id)).length : 0;
  const upcoming = sessions.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-8">
      <PageHeader
        title={me ? `Hello, ${me.name}` : "Welcome to the league"}
        pattern={me?.favoriteFaction ?? "alliance"}
        description={
          me
            ? "Keep your profile fresh and join the next game night."
            : "Set up your player profile so you can join game nights and show up on the leaderboard."
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          {me && (
            <Link href={`/players/${me.id}`} className="btn secondary small">
              View my public profile
            </Link>
          )}
          {me && (
            <Link href="/report" className="btn secondary small">
              Report a game
            </Link>
          )}
          {viewer.isAdmin && (
            <Link href="/admin" className="btn acorn small">
              <ShieldCheck size={18} aria-hidden="true" /> Organizer tools
            </Link>
          )}
          <form action={signOut}>
            <button className="btn secondary small">Sign out</button>
          </form>
        </div>
      </PageHeader>

      {me ? (
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="card p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-4">
              <Avatar name={me.name} avatar={me.avatar} bg={me.avatarBg} crop={me.avatarCrop} size={72} />
              <h2 className="text-2xl font-bold">Your profile</h2>
            </div>
            <ProfileForm mode="edit" initial={me} />
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Game nights</h2>
            {upcoming.length === 0 ? (
              <p className="card p-5 text-bark-soft">No game nights are scheduled yet.</p>
            ) : (
              upcoming.slice(0, 4).map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  attendees={signups
                    .filter((x) => x.sessionId === s.id)
                    .flatMap((x) => {
                      const p = playerById.get(x.playerId);
                      return p ? [p] : [];
                    })}
                  state={rsvpStateFor(viewer, s, signups, today)}
                />
              ))
            )}
          </section>

          <section className="card h-fit p-5 sm:p-7 lg:col-span-2">
            <h2 className="text-2xl font-bold">Is another name actually you?</h2>
            <p className="mt-1 mb-5 max-w-[70ch] text-bark-soft">
              Made a second account, or did an organizer log your games under a different name? Ask to claim that name.
              When an organizer approves, this profile is merged into it: you keep that name&apos;s games and points, and
              the details you filled in here carry over.
            </p>
            <div className="max-w-xl">
              <ClaimForm players={unclaimed} pending={viewer.claim} />
            </div>
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card stitched p-5 sm:p-7">
            <h2 className="text-2xl font-bold">I&apos;m new here</h2>
            <p className="mt-1 mb-5 text-bark-soft">Create a fresh player profile.</p>
            <ProfileForm mode="create" />
          </section>

          <section className="card h-fit p-5 sm:p-7">
            <h2 className="text-2xl font-bold">I&apos;ve already played</h2>
            <p className="mt-1 mb-5 text-bark-soft">
              If an organizer has already logged your games, claim your name instead so your history comes with you.
            </p>
            <ClaimForm players={unclaimed} pending={viewer.claim} />
          </section>
        </div>
      )}

      {!viewer.isAdmin && (
        <section className="card p-5 sm:p-7">
          <h2 className="mb-2 text-2xl font-bold">Delete my account</h2>
          <DeleteAccountForm hasGames={Boolean(me && gamesPlayed > 0)} />
        </section>
      )}
    </div>
  );
}
