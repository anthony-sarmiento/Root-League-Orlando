"use client";

import { startTransition, useActionState, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { rejectReport, type FormState } from "@/app/admin/actions";
import { FactionBadge } from "@/components/FactionBadge";
import { formatDate, ordinal } from "@/lib/format";
import { reportAsGame, type GameReport } from "@/lib/game-report";
import type { Player, Session } from "@/lib/league";
import { FormMessages } from "./FormMessages";
import { LogGameForm } from "./LogGameForm";

export interface QueuedReport {
  report: GameReport;
  /** A logged game already has these players on this date. */
  duplicate: boolean;
}

interface Shared {
  players: Player[];
  sessions: Session[];
  today: string;
}

function ReportItem({ item, shared, names }: { item: QueuedReport; shared: Shared; names: Map<string, string> }) {
  const { report } = item;
  const [reviewing, setReviewing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [state, reject, pending] = useActionState<FormState, FormData>(rejectReport, {});
  const results = [...report.results].sort((a, b) => a.placement - b.placement);

  return (
    <li className="space-y-3 rounded-2xl border-2 border-bark/20 bg-parchment/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-bold">
            {report.reporterName ?? "A player"} reported a table
          </p>
          <p className="text-sm text-bark-soft">
            {formatDate(report.playedOn, { weekday: "long" })} · Round {report.round} · {results.length} players · sent{" "}
            {formatDate(report.createdAt.slice(0, 10))}
          </p>
        </div>
        {!reviewing && !rejecting && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn small" onClick={() => setReviewing(true)}>
              Review and approve
            </button>
            <button type="button" className="btn danger" onClick={() => setRejecting(true)}>
              Reject
            </button>
          </div>
        )}
      </div>

      {item.duplicate && (
        <p className="flex items-start gap-2 rounded-xl bg-honey/30 px-3 py-2 text-sm font-semibold">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-acorn-deep" aria-hidden="true" />
          A table with these same players is already logged for that date. This may be the same game.
        </p>
      )}
      {report.note && <p className="text-sm text-bark-soft">“{report.note}”</p>}

      {!reviewing && (
        <ol className="space-y-1">
          {results.map((r) => (
            <li key={r.playerId} className="flex items-center gap-2.5 text-sm">
              <span className="w-8 font-bold text-bark-soft">{ordinal(r.placement)}</span>
              <FactionBadge faction={r.faction} size={24} />
              <span className="font-semibold">{names.get(r.playerId) ?? "Unknown"}</span>
            </li>
          ))}
        </ol>
      )}

      {reviewing && (
        <div className="rounded-2xl border-2 border-moss/50 bg-paper/60 p-4">
          <p className="mb-3 font-display text-lg font-bold">Check the table, fix anything that&apos;s off, then approve</p>
          <LogGameForm
            {...shared}
            mode="review"
            reportId={report.id}
            game={reportAsGame(report)}
            onSaved={() => setReviewing(false)}
          />
          <button type="button" className="btn secondary small mt-3" onClick={() => setReviewing(false)}>
            Cancel
          </button>
        </div>
      )}

      {rejecting && (
        <form
          className="space-y-3 rounded-2xl border-2 border-berry/40 bg-paper/60 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(() => reject(formData));
          }}
        >
          <input type="hidden" name="reportId" value={report.id} />
          <label className="block">
            <span className="text-sm font-bold">Reason (the player will see this)</span>
            <input name="reason" maxLength={280} className="field mt-1" placeholder="For example: wrong night, or this was already logged." />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn danger">
              {pending ? "Rejecting…" : "Reject this report"}
            </button>
            <button type="button" className="btn secondary small" onClick={() => setRejecting(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <FormMessages state={state} />
    </li>
  );
}

/** Player-reported tables waiting for approval. */
export function ReportQueue({ items, ...shared }: Shared & { items: QueuedReport[] }) {
  const names = new Map(shared.players.map((p) => [p.id, p.name]));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <ReportItem key={item.report.id} item={item} shared={shared} names={names} />
      ))}
    </ul>
  );
}
