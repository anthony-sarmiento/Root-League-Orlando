import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { SiteNav } from "@/components/SiteNav";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getViewer } from "@/lib/viewer";

function Acorn() {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true">
      <path d="M24 4c3 0 5 2 5 4l-5 2-5-2c0-2 2-4 5-4Z" fill="#5f7d3b" />
      <path
        d="M8 20c0-5 7-8 16-8s16 3 16 8c0 2-1 3-2 3H10c-1 0-2-1-2-3Z"
        fill="#c9772f"
        stroke="#4b3426"
        strokeWidth="2"
      />
      <path
        d="M11 25h26c0 10-5 19-13 19S11 35 11 25Z"
        fill="#e2b04a"
        stroke="#4b3426"
        strokeWidth="2"
      />
      <path d="M17 14l1 5M24 13v6M31 14l-1 5" stroke="#4b3426" strokeWidth="1.5" opacity=".5" />
    </svg>
  );
}

export async function SiteHeader() {
  const viewer = await getViewer();

  return (
    <header className="plank">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="order-1 flex items-center gap-2 text-parchment">
          <Acorn />
          <span className="font-display text-lg leading-tight font-bold sm:text-2xl">
            Root League <span className="text-[#f2c868]">Orlando</span>
          </span>
        </Link>

        <div className="order-2 ml-auto md:order-3">
          {viewer ? (
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-full bg-black/15 py-1 pr-4 pl-1 font-bold text-parchment transition-colors hover:bg-black/25"
            >
              <Avatar name={viewer.player?.name ?? viewer.email ?? "Me"} avatar={viewer.player?.avatar} size={32} />
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
          <SiteNav />
        </div>
      </div>
    </header>
  );
}
