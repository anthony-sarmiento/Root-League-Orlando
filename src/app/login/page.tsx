import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Organizer sign-in" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card stitched p-6">
        <h1 className="text-3xl font-bold">Organizer sign-in</h1>
        <p className="mt-1 mb-5 text-bark-soft">For league organizers who log games and run game nights.</p>
        {isSupabaseConfigured ? (
          <LoginForm />
        ) : (
          <p className="rounded-xl bg-honey/25 p-3 text-sm font-semibold">
            The league database isn&apos;t connected yet, so sign-in is switched off. See the README for setup.
          </p>
        )}
      </div>
    </div>
  );
}
