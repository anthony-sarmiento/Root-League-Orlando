"use client";

import { useActionState } from "react";
import { approveClaim, deleteSeason, rejectClaim, saveSeason, type FormState } from "@/app/admin/actions";
import { FormMessages } from "./FormMessages";

interface SeasonProps {
  number: number;
  startsOn: string;
  endsOn: string;
}

/** One season's dates, editable in place; or an empty row to add the next one. */
export function SeasonForm({ number, startsOn, endsOn, isNew = false }: SeasonProps & { isNew?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSeason, {});

  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="block w-20">
          <span className="text-sm font-bold">Season</span>
          <input
            name="number"
            type="number"
            min={1}
            defaultValue={number}
            readOnly={!isNew}
            className={`field mt-1 ${isNew ? "" : "bg-parchment"}`}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Starts</span>
          <input name="startsOn" type="date" required defaultValue={startsOn} className="field mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Ends</span>
          <input name="endsOn" type="date" required defaultValue={endsOn} className="field mt-1" />
        </label>
        <button type="submit" disabled={pending} className="btn small">
          {pending ? "Saving…" : isNew ? "Add season" : "Save"}
        </button>
        {!isNew && <DeleteSeason number={number} />}
      </form>
      <FormMessages state={state} />
    </div>
  );
}

function DeleteSeason({ number }: { number: number }) {
  return (
    <button
      type="submit"
      formAction={deleteSeason}
      className="btn danger"
      onClick={(e) => {
        if (!window.confirm(`Delete Season ${number}? Its games stay, but they'll no longer count towards any season.`)) {
          e.preventDefault();
        }
      }}
    >
      Delete
    </button>
  );
}

/** Approve or reject someone's request to own an existing player name. */
export function ClaimActions({ userId, playerName }: { userId: string; playerName: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={approveClaim}>
        <input type="hidden" name="userId" value={userId} />
        <button type="submit" className="btn small" aria-label={`Approve claim on ${playerName}`}>
          Approve
        </button>
      </form>
      <form
        action={rejectClaim}
        onSubmit={(e) => {
          if (!window.confirm(`Reject the claim on "${playerName}"?`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <button type="submit" className="btn danger" aria-label={`Reject claim on ${playerName}`}>
          Reject
        </button>
      </form>
    </div>
  );
}
