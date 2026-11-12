"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { approveReport, logGame, updateGame, type FormState } from "@/app/admin/actions";
import { submitGameReport } from "@/app/report/actions";
import { MAX_ROUNDS, PLAYERS_PER_GAME, TABLE_SIZES, type Game, type Player, type Session } from "@/lib/league";
import { FormMessages } from "./FormMessages";
import { TableBuilder, type Seat } from "./TableBuilder";

interface Props {
  players: Player[];
  /** Game nights to attach the table to, newest first. */
  sessions: Session[];
  today: string;
  /**
   * What the form does. "log" and "edit" are for organizers; "report" is a player's report that waits for approval;
   * "review" is an organizer approving a report (pre-filled from `game`, which carries the report's table).
   */
  mode?: "log" | "edit" | "report" | "review";
  /** The table to start from, when editing or reviewing. */
  game?: Game;
  /** The report being reviewed (mode "review"). */
  reportId?: string;
  /** The signed-in player, so a report can remind them to include themselves. */
  reporterId?: string;
  /** Night and round to start on when logging (for "add a table to this round"). */
  defaultSessionId?: string;
  defaultRound?: number;
  /** Called after a successful save (to close an inline editor). */
  onSaved?: () => void;
}

const emptySeats = (n: number): Seat[] => Array.from({ length: n }, () => ({ playerId: "", faction: "" }));

/** Logs a table, or edits one: any night, any round, 3 or 4 players, finishing order top to bottom. */
export function LogGameForm({
  players,
  sessions,
  today,
  mode: modeProp,
  game,
  reportId,
  reporterId,
  defaultSessionId,
  defaultRound,
  onSaved,
}: Props) {
  const mode = modeProp ?? (game ? "edit" : "log");
  // Editing and reviewing close themselves after saving; logging and reporting stay open for the next table.
  const editing = mode === "edit" || mode === "review";
  const serverAction = { log: logGame, edit: updateGame, report: submitGameReport, review: approveReport }[mode];
  const [state, action, pending] = useActionState<FormState, FormData>(serverAction, {});

  const [tableSize, setTableSize] = useState<number>(game ? game.results.length : PLAYERS_PER_GAME);
  const [seats, setSeats] = useState<Seat[]>(() =>
    game
      ? [...game.results]
          .sort((a, b) => a.placement - b.placement)
          .map((r) => ({ playerId: r.playerId, faction: r.faction }))
      : emptySeats(PLAYERS_PER_GAME),
  );
  const [sessionId, setSessionId] = useState(
    game?.sessionId ?? defaultSessionId ?? sessions.find((s) => s.date === today)?.id ?? "",
  );
  const [playedOn, setPlayedOn] = useState(game?.playedOn ?? today);
  const [round, setRound] = useState(game?.round ?? defaultRound ?? 1);
  const [seenNonce, setSeenNonce] = useState(0);

  // After a successful save a new table clears its seats (night and round stay, ready for the next table).
  // Errors keep everything so it can be fixed. Adjusting state while rendering is the supported way to react to
  // a changed value without an extra render pass.
  if (state.nonce && state.nonce !== seenNonce) {
    setSeenNonce(state.nonce);
    if (!editing) setSeats(emptySeats(tableSize));
  }

  // An edit closes itself once it has saved.
  useEffect(() => {
    if (editing && state.nonce) onSaved?.();
  }, [editing, state.nonce, onSaved]);

  const resize = (n: number) => {
    setTableSize(n);
    setSeats((prev) => (n <= prev.length ? prev.slice(0, n) : [...prev, ...emptySeats(n - prev.length)]));
  };
  const attached = sessions.find((s) => s.id === sessionId);
  // Organizers see a tighter form than players reporting a game.
  const compact = mode !== "report";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Dispatch manually so React doesn't auto-reset the form when validation fails.
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
      className="space-y-4"
    >
      {mode === "edit" && game && <input type="hidden" name="gameId" value={game.id} />}
      {mode === "review" && reportId && <input type="hidden" name="reportId" value={reportId} />}

      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_0.7fr] lg:grid-cols-[1.4fr_1fr_0.7fr_auto]">
        <label className="block">
          <span className="text-sm font-bold">Game night</span>
          <select
            name="sessionId"
            className="field mt-1"
            value={sessionId}
            onChange={(e) => {
              setSessionId(e.target.value);
              const picked = sessions.find((s) => s.id === e.target.value);
              if (picked) setPlayedOn(picked.date);
            }}
          >
            <option value="">No game night (pick a date)</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.date} · {s.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-bold">Date played</span>
          <input
            type="date"
            name={attached ? undefined : "playedOn"}
            required
            className="field mt-1"
            value={attached ? attached.date : playedOn}
            disabled={Boolean(attached)}
            onChange={(e) => setPlayedOn(e.target.value)}
          />
          {/* A disabled input isn't submitted; the server dates the table by its game night anyway. */}
          {attached && <input type="hidden" name="playedOn" value={attached.date} />}
        </label>
        <label className="block">
          <span className="text-sm font-bold">Round</span>
          <select name="round" className="field mt-1" value={round} onChange={(e) => setRound(Number(e.target.value))}>
            {Array.from({ length: MAX_ROUNDS }, (_, i) => i + 1).map((r) => (
              <option key={r} value={r}>
                Round {r}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-bold">Table size</legend>
          <div className="mt-1 flex gap-2">
            {TABLE_SIZES.map((n) => (
              <label
                key={n}
                className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-bark/25 bg-paper px-4 py-1.5 text-sm font-bold has-[:checked]:border-moss has-[:checked]:bg-moss/15 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-acorn"
              >
                <input type="radio" name="tableSize" value={n} checked={tableSize === n} onChange={() => resize(n)} className="sr-only" />
                {n} players
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <TableBuilder players={players} seats={seats} tableSize={tableSize} onSeatsChange={setSeats} reporterId={reporterId} compact={compact} />

      {mode === "report" && (
        <label className="block">
          <span className="text-sm font-bold">Note for the organizers (optional)</span>
          <textarea name="note" maxLength={280} rows={2} className="field mt-1" placeholder="Anything they should know? A tie-break, a late joiner…" />
        </label>
      )}

      <FormMessages state={state} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn">
          {pending
            ? "Saving…"
            : { log: "Save table", edit: "Save changes", report: "Send for approval", review: "Approve this table" }[mode]}
        </button>
        {editing && onSaved && (
          <button type="button" className="btn secondary" onClick={onSaved}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
