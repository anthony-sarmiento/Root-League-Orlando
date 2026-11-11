"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "@/app/login/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm font-bold">Email</span>
        <input name="email" type="email" autoComplete="email" required className="field mt-1" />
      </label>
      <label className="block">
        <span className="text-sm font-bold">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="field mt-1" />
      </label>
      {state.error && (
        <p role="alert" className="rounded-xl bg-berry/10 px-3 py-2 text-sm font-semibold text-berry">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn w-full">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
