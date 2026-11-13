import type { Metadata } from "next";
import { AuthShell } from "@/components/account/AuthShell";
import { GoogleSignIn, SignInForm } from "@/components/account/AuthForms";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  oauth: "Google sign-in didn't work. Please try again, or use your email and password.",
  rate: "Too many attempts. Wait a few minutes and try again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;
  return (
    <AuthShell title="Welcome back" intro="Sign in to manage your profile and join game nights.">
      {isSupabaseConfigured ? (
        <>
          {message && (
            <p role="alert" className="mb-4 rounded-xl bg-berry/10 px-3 py-2 text-sm font-semibold text-berry">
              {message}
            </p>
          )}
          <SignInForm />
          <GoogleSignIn />
        </>
      ) : (
        <p className="rounded-xl bg-honey/25 p-3 text-sm font-semibold">
          The league database isn&apos;t connected yet, so sign-in is switched off. See the README for setup.
        </p>
      )}
    </AuthShell>
  );
}
