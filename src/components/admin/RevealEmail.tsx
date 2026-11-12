"use client";

import { startTransition, useActionState } from "react";
import { Eye } from "lucide-react";
import { revealEmail, type FormState } from "@/app/admin/actions";

/**
 * An email address, masked until an organizer asks to see it. The full address is not in the page until then:
 * it is fetched for this one account, on request, by a server action that checks the caller is an organizer.
 */
export function RevealEmail({ userId, masked }: { userId: string; masked: string }) {
  const [state, reveal, pending] = useActionState<FormState, FormData>(revealEmail, {});

  if (state.ok) return <span className="font-bold break-all">{state.ok}</span>;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="font-bold">{masked || "No email"}</span>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(() => reveal(formData));
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <button type="submit" disabled={pending} className="inline-flex items-center gap-1 text-sm font-bold text-moss-deep underline decoration-leaf decoration-2 underline-offset-4">
          <Eye size={14} aria-hidden="true" /> {pending ? "Showing…" : "Show"}
        </button>
      </form>
      {state.errors?.[0] && <span className="text-sm font-semibold text-berry">{state.errors[0]}</span>}
    </span>
  );
}
