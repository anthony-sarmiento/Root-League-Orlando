"use client";

import { startTransition, useActionState, useState } from "react";
import { deleteMyAccount, type ProfileState } from "@/app/account/actions";
import { FormMessages } from "@/components/admin/FormMessages";

/** Removes the person's login and email, after they type DELETE. Their games stay under their player name. */
export function DeleteAccountForm({ hasGames }: { hasGames: boolean }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(deleteMyAccount, {});
  const [typed, setTyped] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      <p className="max-w-[70ch] text-bark-soft">
        This removes your login and your email address from the site for good. You&apos;ll be signed out.{" "}
        {hasGames
          ? "Your games and points stay on the leaderboard under your player name, because they are part of the league's record, but your bio is removed and nobody can sign in as you."
          : "Your player profile is removed too, since it has no games."}
      </p>
      <label className="block max-w-xs">
        <span className="text-sm font-bold">Type DELETE to confirm</span>
        <input
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="field mt-1"
        />
      </label>
      <FormMessages state={state} />
      <button type="submit" disabled={pending || typed !== "DELETE"} className="btn danger">
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
