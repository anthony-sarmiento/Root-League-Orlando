"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { setRsvp } from "@/app/sessions/actions";
import type { RsvpState } from "@/lib/rsvp";

function SubmitButton({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function RsvpControl({ sessionId, state }: { sessionId: string; state: RsvpState }) {
  switch (state) {
    case "past":
      return null;
    case "signed-out":
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/signup" className="btn acorn small">Sign up to join</Link>
          <Link href="/login" className="text-sm font-bold underline decoration-leaf decoration-2 underline-offset-4 hover:text-moss-deep">
            Sign in
          </Link>
        </div>
      );
    case "no-profile":
      return (
        <Link href="/account" className="btn acorn small">Set up your profile to join</Link>
      );
    case "going":
      return (
        <form action={setRsvp} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="intent" value="leave" />
          <span className="inline-flex items-center gap-1.5 font-bold text-moss-deep" role="status">
            <Check size={18} strokeWidth={3} aria-hidden="true" /> You&apos;re going
          </span>
          <SubmitButton label="Can't make it" className="btn secondary small" />
        </form>
      );
    case "not-going":
      return (
        <form action={setRsvp}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="intent" value="join" />
          <SubmitButton label="Join this night" className="btn small" />
        </form>
      );
  }
}
