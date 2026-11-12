"use client";

import { startTransition, useActionState, useState } from "react";
import { ChevronDown, Crown, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteSession, updateSession, type FormState } from "@/app/admin/actions";
import { formatDate, ordinal } from "@/lib/format";
import { MAX_ROUNDS, getFaction, type Game, type Player, type Session } from "@/lib/league";
import { DeleteGameForm } from "./SimpleForms";
import { FormMessages } from "./FormMessages";
import { LogGameForm } from "./LogGameForm";

interface Shared {
  players: Player[];
  /** Every game night, newest first (used by the table forms). */
  sessions: Session[];
  today: string;
}

function TableCard({ game, playerName, shared }: { game: Game; playerName: Map<string, string>; shared: Shared }) {
  const [editing, setEditing] = useState(false);
  const results = [...game.results].sort((a, b) => a.placement - b.placement);
  const summary = results.map((r) => `${ordinal(r.placement)} ${playerName.get(r.playerId) ?? "?"}`).join(", ");

  if (editing) {
    return (
      <li className="rounded-2xl border-2 border-moss/50 bg-paper/60 p-4 md:col-span-2">
        <p className="mb-3 font-display text-lg font-bold">Edit this table</p>
        <LogGameForm {...shared} game={game} onSaved={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="rounded-2xl border-2 border-bark/15 bg-parchment/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-bark-soft">{results.length} players</p>
        <div className="flex gap-2">
          <button type="button" className="btn secondary small" onClick={() => setEditing(true)}>
            <Pencil size={15} aria-hidden="true" /> Edit
          </button>
          <DeleteGameForm gameId={game.id} summary={summary} />
        </div>
      </div>
      <ol className="space-y-1">
        {results.map((r) => (
          <li key={r.playerId} className="flex items-center gap-2 text-sm">
            <span className="w-8 font-bold text-bark-soft">
              {r.placement === 1 ? <Crown size={16} className="text-acorn-deep" aria-label="1st" /> : ordinal(r.placement)}
            </span>
            <span className="font-semibold">{playerName.get(r.playerId) ?? "Unknown"}</span>
            <span className="text-bark-soft">({getFaction(r.faction).name})</span>
          </li>
        ))}
      </ol>
    </li>
  );
}

function RoundSection({
  round,
  games,
  session,
  playerName,
  shared,
}: {
  round: number;
  games: Game[];
  session: Session;
  playerName: Map<string, string>;
  shared: Shared;
}) {
  const [adding, setAdding] = useState(games.length === 0);
  return (
    <section className="space-y-3">
      <h4 className="flex items-baseline gap-3 text-xl font-bold">
        Round {round}
        <span className="text-sm font-semibold text-bark-soft">
          {games.length} {games.length === 1 ? "table" : "tables"}
        </span>
      </h4>
      {games.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {games.map((g) => (
            <TableCard key={g.id} game={g} playerName={playerName} shared={shared} />
          ))}
        </ul>
      )}
      {adding ? (
        <div className="rounded-2xl border-2 border-dashed border-bark/25 p-4">
          <p className="mb-3 font-display text-lg font-bold">Add a table to Round {round}</p>
          <LogGameForm {...shared} defaultSessionId={session.id} defaultRound={round} />
        </div>
      ) : (
        <button type="button" className="btn secondary small" onClick={() => setAdding(true)}>
          <Plus size={16} aria-hidden="true" /> Add a table to Round {round}
        </button>
      )}
    </section>
  );
}

function NightEditor({ session }: { session: Session }) {
  const [saveState, save, saving] = useActionState<FormState, FormData>(updateSession, {});
  const [removeState, remove, removing] = useActionState<FormState, FormData>(deleteSession, {});

  return (
    <div className="space-y-3 rounded-2xl bg-parchment/60 p-4">
      <form
        className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1.4fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(() => save(formData));
        }}
      >
        <input type="hidden" name="sessionId" value={session.id} />
        <label className="block">
          <span className="text-sm font-bold">Date</span>
          <input type="date" name="date" required defaultValue={session.date} className="field mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Title</span>
          <input name="title" maxLength={80} defaultValue={session.title} className="field mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Place</span>
          <input name="location" maxLength={80} defaultValue={session.location} className="field mt-1" />
        </label>
        <button type="submit" disabled={saving} className="btn small">
          {saving ? "Saving…" : "Save night"}
        </button>
      </form>
      <FormMessages state={saveState} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const message = `Remove the ${formatDate(session.date)} game night?\n\nIts tables stay in the standings, but they will no longer belong to a night. This can't be undone.`;
          if (!window.confirm(message)) return;
          const formData = new FormData(e.currentTarget);
          startTransition(() => remove(formData));
        }}
      >
        <input type="hidden" name="sessionId" value={session.id} />
        <button type="submit" disabled={removing} className="btn danger">
          <Trash2 size={16} aria-hidden="true" /> Remove this night
        </button>
      </form>
      <FormMessages state={removeState} />
    </div>
  );
}

function NightCard({
  session,
  games,
  playerName,
  shared,
  open,
  onToggle,
}: {
  session: Session;
  games: Game[];
  playerName: Map<string, string>;
  shared: Shared;
  open: boolean;
  onToggle: () => void;
}) {
  // Rounds that have tables, plus any the organizer has opened but not filled yet.
  const used = [...new Set(games.map((g) => g.round))].sort((a, b) => a - b);
  const [extraRounds, setExtraRounds] = useState<number[]>([]);
  const rounds = [...new Set([...used, ...extraRounds, ...(used.length === 0 ? [1] : [])])].sort((a, b) => a - b);
  const nextRound = Math.max(0, ...rounds) + 1;

  return (
    <li className="card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left sm:px-6"
      >
        <span className="min-w-0">
          <span className="block font-display text-xl font-bold">{formatDate(session.date, { weekday: "long" })}</span>
          <span className="block truncate text-sm text-bark-soft">
            {session.title} · {session.location} · {games.length} {games.length === 1 ? "table" : "tables"} ·{" "}
            {used.length || 1} {(used.length || 1) === 1 ? "round" : "rounds"}
          </span>
        </span>
        <ChevronDown size={20} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="space-y-6 border-t-2 border-dashed border-bark/20 p-4 sm:px-6">
          <NightEditor session={session} />
          {rounds.map((r) => (
            <RoundSection
              key={r}
              round={r}
              games={games.filter((g) => g.round === r)}
              session={session}
              playerName={playerName}
              shared={shared}
            />
          ))}
          {nextRound <= MAX_ROUNDS && (
            <button type="button" className="btn secondary" onClick={() => setExtraRounds((prev) => [...prev, nextRound])}>
              <Plus size={16} aria-hidden="true" /> Add Round {nextRound}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** Every game night with its rounds and tables: edit a night, add rounds and tables, fix or delete a table. */
export function NightManager({ players, sessions, games, today }: Shared & { games: Game[] }) {
  const playerName = new Map(players.map((p) => [p.id, p.name]));
  const shared: Shared = { players, sessions, today };
  // Start with the most recent night that has already started open.
  const [openId, setOpenId] = useState<string | null>(sessions.find((s) => s.date <= today)?.id ?? sessions[0]?.id ?? null);
  const loose = games.filter((g) => !g.sessionId);

  return (
    <div className="space-y-4">
      {sessions.length === 0 ? (
        <p className="text-bark-soft">No game nights yet. Schedule one above.</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <NightCard
              key={s.id}
              session={s}
              games={games.filter((g) => g.sessionId === s.id)}
              playerName={playerName}
              shared={shared}
              open={openId === s.id}
              onToggle={() => setOpenId(openId === s.id ? null : s.id)}
            />
          ))}
        </ul>
      )}

      {loose.length > 0 && (
        <section className="card space-y-3 p-4 sm:px-6">
          <h3 className="text-xl font-bold">Tables without a game night</h3>
          <p className="text-sm text-bark-soft">Edit a table to attach it to a night.</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {[...loose]
              .sort((a, b) => b.playedOn.localeCompare(a.playedOn))
              .map((g) => (
                <div key={g.id}>
                  <p className="mb-1 text-sm font-bold text-bark-soft">{formatDate(g.playedOn)}</p>
                  <TableCard game={g} playerName={playerName} shared={shared} />
                </div>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
