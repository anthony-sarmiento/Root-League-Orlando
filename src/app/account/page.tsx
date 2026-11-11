import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { ClaimForm } from "@/components/account/ClaimForm";
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

  const { players, sessions, signups } = await getLeagueData();
  const today = todayISO();
  const me = viewer.player;
  const playerById = new Map(players.map((p) => [p.id, p]));

  // Names that already belong to an account can't be claimed.
  let unclaimed = players;
  if (!me) {
    const supabase = await createServerSupabase();
    const { data } = await supabase.rpc("claimed_player_ids");
    const claimed = new Set<string>((data as string[] | null) ?? []);
    unclaimed = players.filter((p) => !claimed.has(p.id));
  }

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
              <Avatar name={me.name} avatar={me.avatar} size={64} />
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
    </div>
  );
}
