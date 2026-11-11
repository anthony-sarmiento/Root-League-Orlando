import type { Metadata } from "next";
import { AuthShell } from "@/components/account/AuthShell";
import { SignInForm } from "@/components/account/AuthForms";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" intro="Sign in to manage your profile and join game nights.">
      {isSupabaseConfigured ? (
        <SignInForm />
      ) : (
        <p className="rounded-xl bg-honey/25 p-3 text-sm font-semibold">
          The league database isn&apos;t connected yet, so sign-in is switched off. See the README for setup.
        </p>
      )}
    </AuthShell>
  );
}
