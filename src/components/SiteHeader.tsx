"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/players", label: "Players" },
  { href: "/factions", label: "Factions" },
  { href: "/sessions", label: "Sessions" },
];

function Acorn() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
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

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="plank">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-parchment">
          <Acorn />
          <span className="font-display text-xl font-bold leading-tight sm:text-2xl">
            Root League <span className="text-honey">Orlando</span>
          </span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="nav-link"
              aria-current={isActive(l.href) ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
