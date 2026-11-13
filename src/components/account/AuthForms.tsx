"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signInWithGoogle, signUp, type AuthState } from "@/app/login/actions";
import { Turnstile } from "@/components/account/Turnstile";
import { googleSignInEnabled } from "@/lib/captcha";

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
      <Turnstile resetSignal={state} />
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
        <input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} className="field mt-1" />
        <span className="mt-1 block text-sm text-bark-soft">At least 10 characters. A few words in a row works well.</span>
      </label>
      <label className="block">
        <span className="text-sm font-bold">Type it again</span>
        <input name="confirm" type="password" autoComplete="new-password" required minLength={10} maxLength={128} className="field mt-1" />
      </label>
      {/* Honeypot: hidden from people and from screen readers, so only bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company
          <input name="company" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Turnstile resetSignal={state} />
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

/** "Continue with Google", under a divider. Shown only once Google sign-in has been switched on. */
export function GoogleSignIn() {
  if (!googleSignInEnabled) return null;
  return (
    <div className="mt-6 space-y-4">
      <p className="flex items-center gap-3 text-sm text-bark-soft" role="separator">
        <span className="h-px flex-1 bg-bark/25" aria-hidden="true" />
        or
        <span className="h-px flex-1 bg-bark/25" aria-hidden="true" />
      </p>
      <form action={signInWithGoogle}>
        <button type="submit" className="btn secondary w-full">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
            <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          Continue with Google
        </button>
      </form>
    </div>
  );
}
