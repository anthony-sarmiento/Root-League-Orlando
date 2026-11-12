import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { LogGameForm } from "@/components/admin/LogGameForm";
import { FactionBadge } from "@/components/FactionBadge";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { WithdrawReportButton } from "@/components/WithdrawReportButton";
import { getLeagueData } from "@/lib/data";
import { formatDate, ordinal } from "@/lib/format";
import type { GameReport } from "@/lib/game-report";
import { todayISO } from "@/lib/seasons";
import { createServerSupabase } from "@/lib/supabase/server";
import { fetchMyReports } from "@/lib/reports";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Report a game" };
export const dynamic = "force-dynamic";

const STATUS = {
  pending: { label: "Waiting for an organizer", Icon: Clock, tone: "bg-honey/30 text-bark" },
  approved: { label: "Approved", Icon: CheckCircle2, tone: "bg-leaf/40 text-moss-deep" },
  rejected: { label: "Not approved", Icon: XCircle, tone: "bg-berry/15 text-berry" },
} as const;

function ReportCard({ report, names }: { report: GameReport; names: Map<string, string> }) {
  const status = STATUS[report.status];
  const results = [...report.results].sort((a, b) => a.placement - b.placement);
  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl font-bold">
            {formatDate(report.playedOn, { weekday: "long" })}
            <span className="ml-3 text-sm font-semibold text-bark-soft">
              Round {report.round} · {results.length} players
            </span>
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${status.tone}`}>
          <status.Icon size={16} aria-hidden="true" /> {status.label}
        </span>
      </div>
      <ol className="mt-3 space-y-1.5">
        {results.map((r) => (
          <li key={r.playerId} className="flex items-center gap-2.5 text-sm">
            <span className="w-8 font-bold text-bark-soft">{ordinal(r.placement)}</span>
            <FactionBadge faction={r.faction} size={26} />
            <span className="font-semibold">{names.get(r.playerId) ?? "Unknown"}</span>
          </li>
        ))}
      </ol>
      {report.status === "rejected" && report.rejectReason && (
        <p className="mt-3 rounded-xl bg-berry/10 px-3 py-2 text-sm text-berry">
          <strong>Organizer note:</strong> {report.rejectReason}
        </p>
      )}
      {report.status === "pending" && (
        <div className="mt-3">
          <WithdrawReportButton reportId={report.id} />
        </div>
      )}
    </li>
  );
}

export default async function ReportPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const { players, sessions } = await getLeagueData();
  const today = todayISO();
  const me = viewer.player;

  // A game can only have been played on a night that has started.
  const nights = sessions.filter((s) => s.date <= today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  const supabase = await createServerSupabase();
  const { reports, available } = await fetchMyReports(supabase, viewer.userId);
  const names = new Map(players.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-12">
      <PageHeader
        title="Report a game"
        pattern="vagabond"
        description="Played a table that isn't on the board yet? Send it here. An organizer checks it before it counts toward the standings."
      />

      {!available ? (
        <p className="card p-6 text-bark-soft">Game reports aren&apos;t switched on yet. Please tell an organizer.</p>
      ) : !me ? (
        <div className="card space-y-3 p-6">
          <h2 className="text-2xl font-bold">Make your player profile first</h2>
          <p className="text-bark-soft">Reports are tied to your player name, so you need a profile (or a claimed name) before you can send one.</p>
          <Link href="/account" className="btn acorn">Set up my profile</Link>
        </div>
      ) : (
        <section className="card p-5 sm:p-7">
          <h2 className="mb-1 text-3xl font-bold">Your table</h2>
          <p className="mb-5 text-bark-soft">
            Pick the night and round, then list everyone at the table in finishing order, starting with 1st. You need to
            be one of the players. Nothing counts until an organizer approves it, and you can withdraw a report while it
            is waiting.
          </p>
          <LogGameForm mode="report" players={players} sessions={nights} today={today} reporterId={me.id} />
        </section>
      )}

      {available && me && (
        <section className="space-y-5">
          <SectionHeading onDark title="Your reports" description="What you've sent, and what happened to it." />
          {reports.length === 0 ? (
            <p className="card p-6 text-bark-soft">You haven&apos;t reported anything yet.</p>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2">
              {reports.map((r) => (
                <ReportCard key={r.id} report={r} names={names} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
