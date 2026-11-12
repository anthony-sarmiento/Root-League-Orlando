import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { SiteNav } from "@/components/SiteNav";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { countPendingReports } from "@/lib/reports";
import { getViewer } from "@/lib/viewer";

export async function SiteHeader() {
  const viewer = await getViewer();
  const pendingReports = viewer?.isAdmin ? await countPendingReports() : 0;

  return (
    <header className="plank relative z-20">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
        <Link href="/" className="order-1 font-display text-xl leading-tight font-bold text-parchment sm:text-3xl">
          Root League <span className="text-[#f2c868]">Orlando</span>
        </Link>

        <div className="order-2 ml-auto md:order-3">
          {viewer ? (
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-full bg-black/20 py-1 pr-4 pl-1 font-bold text-parchment transition-colors hover:bg-black/30"
            >
              <Avatar name={viewer.player?.name ?? viewer.email ?? "Me"} avatar={viewer.player?.avatar} bg={viewer.player?.avatarBg} crop={viewer.player?.avatarCrop} size={34} />
              <span className="max-w-32 truncate">{viewer.player?.name ?? "My account"}</span>
            </Link>
          ) : isSupabaseConfigured ? (
            <div className="flex items-center gap-2">
              <Link href="/login" className="nav-link">Sign in</Link>
              <Link href="/signup" className="btn acorn small hidden sm:inline-flex">Join the league</Link>
            </div>
          ) : null}
        </div>

        <div className="order-3 w-full md:order-2 md:ml-auto md:w-auto">
          <SiteNav isAdmin={viewer?.isAdmin === true} pendingReports={pendingReports} />
        </div>
      </div>
    </header>
  );
}
