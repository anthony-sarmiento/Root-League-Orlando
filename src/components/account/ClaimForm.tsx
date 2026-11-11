"use client";

import { startTransition, useActionState } from "react";
import { submitClaim, withdrawClaim, type ProfileState } from "@/app/account/actions";
import { FormMessages } from "@/components/admin/FormMessages";
import type { Player } from "@/lib/league";
import type { PendingClaim } from "@/lib/viewer";

export function ClaimForm({ players, pending: claim }: { players: Player[]; pending: PendingClaim | null }) {
  const [state, action, busy] = useActionState<ProfileState, FormData>(submitClaim, {});

  if (claim) {
    return (
      <div className="space-y-3">
        <p>
          You asked to claim <strong>{claim.playerName}</strong>. An organizer will confirm it soon, and then that
          name&apos;s games and points will be yours.
        </p>
        <form action={withdrawClaim}>
          <button type="submit" className="btn secondary small">
            Withdraw my claim
          </button>
        </form>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <p className="text-bark-soft">Every existing name already belongs to an account, so there&apos;s nothing to claim.</p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="text-sm font-bold">Which name is yours?</span>
        <select name="playerId" required defaultValue="" className="field mt-1">
          <option value="" disabled>
            Choose a name…
          </option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-bold">A note for the organizers (optional)</span>
        <input name="note" maxLength={280} placeholder="e.g. I play Marquise on Thursdays" className="field mt-1" />
      </label>
      <FormMessages state={state} />
      <button type="submit" disabled={busy} className="btn secondary">
        {busy ? "Sending…" : "Ask to claim this name"}
      </button>
    </form>
  );
}
