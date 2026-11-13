import type { Metadata } from "next";
import { AuthShell } from "@/components/account/AuthShell";
import { GoogleSignIn, SignUpForm } from "@/components/account/AuthForms";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Join the league" };
export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Join the league"
      intro="Make an account, pick your character, and RSVP for game nights. New to Root? Everyone starts somewhere."
    >
      {isSupabaseConfigured ? (
        <>
          <SignUpForm />
          <GoogleSignIn />
        </>
      ) : (
        <p className="rounded-xl bg-honey/25 p-3 text-sm font-semibold">
          The league database isn&apos;t connected yet, so sign-up is switched off. See the README for setup.
        </p>
      )}
    </AuthShell>
  );
}
