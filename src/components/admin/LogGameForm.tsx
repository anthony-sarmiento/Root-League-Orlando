"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { logGame, type FormState } from "@/app/admin/actions";
import { FACTIONS, PLACEMENTS, type Player, type Session } from "@/lib/league";
import { ordinal } from "@/lib/format";
import { FormMessages } from "./FormMessages";

interface Props {
  players: Player[];
  /** Game nights to attach the game to, newest first. */
  sessions: Session[];
  today: string;
}

interface Seat {
  playerId: string;
  faction: string;
}

const emptySeats = (): Seat[] => PLACEMENTS.map(() => ({ playerId: "", faction: "" }));

export function LogGameForm({ players, sessions, today }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(logGame, {});
  const [seats, setSeats] = useState<Seat[]>(emptySeats);
  const [sessionId, setSessionId] = useState(sessions.find((s) => s.date === today)?.id ?? "");
  const [playedOn, setPlayedOn] = useState(today);
  const handledOk = useRef<string | undefined>(undefined);

  // Clear the seats after a successful save; keep everything on an error so it can be fixed.
  useEffect(() => {
    if (state.ok && state.ok !== handledOk.current) {
      handledOk.current = state.ok;
      setSeats(emptySeats());
    }
  }, [state]);

  const update = (i: number, patch: Partial<Seat>) =>
    setSeats((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const takenPlayers = new Set(seats.map((s) => s.playerId).filter(Boolean));
  const takenFactions = new Set(seats.map((s) => s.faction).filter(Boolean));
  const attached = sessions.find((s) => s.id === sessionId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Dispatch manually so React doesn't auto-reset the form when validation fails.
        const formData = new FormData(e.currentTarget);
        handledOk.current = undefined;
        startTransition(() => action(formData));
      }}
      className="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
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
          {/* A disabled input isn't submitted; the server dates the game by its game night anyway. */}
          {attached && <input type="hidden" name="playedOn" value={attached.date} />}
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold">Results, in finishing order</legend>
        {PLACEMENTS.map((placement, i) => (
          <div key={placement} className="grid grid-cols-[3.25rem_1fr_1fr] items-center gap-2">
            <span className="font-display text-lg font-bold text-acorn">{ordinal(placement)}</span>
            <select
              name={`player-${i}`}
              aria-label={`${ordinal(placement)} place player`}
              className="field"
              value={seats[i].playerId}
              onChange={(e) => update(i, { playerId: e.target.value })}
              required
            >
              <option value="">Player…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id} disabled={takenPlayers.has(p.id) && seats[i].playerId !== p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              name={`faction-${i}`}
              aria-label={`${ordinal(placement)} place faction`}
              className="field"
              value={seats[i].faction}
              onChange={(e) => update(i, { faction: e.target.value })}
              required
            >
              <option value="">Faction…</option>
              {FACTIONS.map((f) => (
                <option key={f.id} value={f.id} disabled={takenFactions.has(f.id) && seats[i].faction !== f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </fieldset>

      <FormMessages state={state} />
      <button type="submit" disabled={pending} className="btn">
        {pending ? "Saving…" : "Log game"}
      </button>
    </form>
  );
}
