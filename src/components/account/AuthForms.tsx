"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/app/login/actions";

function Messages({ state }: { state: AuthState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="rounded-xl bg-berry/10 px-3 py-2 text-sm font-semibold text-berry">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p role="status" className="rounded-xl bg-leaf/30 px-3 py-2 text-sm font-semibold text-moss-deep">
          {state.notice}
        </p>
      )}
    </>
  );
}

const linkClass = "font-bold text-moss-deep underline decoration-leaf decoration-2 underline-offset-4";

export function SignInForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
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
      <Messages state={state} />
      <button type="submit" disabled={pending} className="btn w-full">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-bark-soft">
        New here?{" "}
        <Link href="/signup" className={linkClass}>
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm font-bold">Email</span>
        <input name="email" type="email" autoComplete="email" required className="field mt-1" />
      </label>
      <label className="block">
        <span className="text-sm font-bold">Password</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={8} className="field mt-1" />
        <span className="mt-1 block text-sm text-bark-soft">At least 8 characters.</span>
      </label>
      <label className="block">
        <span className="text-sm font-bold">Type it again</span>
        <input name="confirm" type="password" autoComplete="new-password" required minLength={8} className="field mt-1" />
      </label>
      <Messages state={state} />
      <button type="submit" disabled={pending} className="btn acorn w-full">
        {pending ? "Creating account…" : "Create my account"}
      </button>
      <p className="text-center text-sm text-bark-soft">
        Already have one?{" "}
        <Link href="/login" className={linkClass}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
