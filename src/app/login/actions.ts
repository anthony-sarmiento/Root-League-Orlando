"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  notice?: string;
}

/** Kept for the existing login form's type. */
export type LoginState = AuthState;

const MIN_PASSWORD = 8;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "The league database isn't connected yet." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Log only the error code, never the email or password.
    console.error("[sign-in] failed:", error.code ?? error.name, error.status);
    if (error.code === "email_not_confirmed") {
      return { error: "That account's email hasn't been confirmed yet. Check your inbox for the confirmation link." };
    }
    if (error.code === "over_request_rate_limit" || error.status === 429) {
      return { error: "Too many attempts. Wait a few minutes and try again." };
    }
    return { error: "That email and password didn't match." };
  }

  redirect("/account");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "The league database isn't connected yet." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters for your password.` };
  if (password !== confirm) return { error: "Those passwords don't match." };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    console.error("[sign-up] failed:", error.code ?? error.name, error.status);
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { error: "Too many sign-ups right now. Wait a few minutes and try again." };
    }
    if (error.code === "weak_password") return { error: "That password is too easy to guess. Try a longer one." };
    if (error.code === "user_already_exists") return { error: "There's already an account with that email. Try signing in." };
    return { error: "Couldn't create your account. Please try again." };
  }

  // Supabase answers "success" for an email that's already registered (to avoid leaking who has an account),
  // but with no identities attached.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "There's already an account with that email. Try signing in." };
  }

  // With email confirmation off there's a session straight away; with it on, they need to confirm first.
  if (data.session) redirect("/account");
  return { notice: "Almost there! We sent a confirmation link to your email. Click it, then sign in." };
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
