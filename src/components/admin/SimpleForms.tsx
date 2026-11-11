"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPlayer, addSession, deleteGame, type FormState } from "@/app/admin/actions";
import { FormMessages } from "./FormMessages";

function useResetOnSuccess(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  const handled = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (state.ok && state.ok !== handled.current) {
      handled.current = state.ok;
      ref.current?.reset();
    }
  }, [state]);
  return ref;
}

export function AddPlayerForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addPlayer, {});
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <label className="block">
        <span className="text-sm font-bold">Player name</span>
        <input name="name" required maxLength={40} autoComplete="off" className="field mt-1" />
      </label>
      <FormMessages state={state} />
      <button type="submit" disabled={pending} className="btn">
        {pending ? "Adding…" : "Add player"}
      </button>
    </form>
  );
}

export function AddSessionForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addSession, {});
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <label className="block">
        <span className="text-sm font-bold">Date</span>
        <input type="date" name="date" required defaultValue={today} className="field mt-1" />
      </label>
      <label className="block">
        <span className="text-sm font-bold">Title</span>
        <input name="title" defaultValue="Root League Night" className="field mt-1" />
      </label>
      <label className="block">
        <span className="text-sm font-bold">Location</span>
        <input name="location" placeholder="Location TBA" className="field mt-1" />
      </label>
      <FormMessages state={state} />
      <button type="submit" disabled={pending} className="btn">
        {pending ? "Adding…" : "Add game night"}
      </button>
    </form>
  );
}

export function DeleteGameForm({ gameId, summary }: { gameId: string; summary: string }) {
  return (
    <form
      action={deleteGame}
      onSubmit={(e) => {
        const message = `Delete this game?\n\n${summary}\n\nThis removes its LP from the standings and can't be undone.`;
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="gameId" value={gameId} />
      <button type="submit" className="btn danger">
        Delete
      </button>
    </form>
  );
}
