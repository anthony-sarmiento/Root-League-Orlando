"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/sessions", label: "Game nights" },
  { href: "/players", label: "Players" },
  { href: "/factions", label: "Factions" },
];

export function SiteNav({ isAdmin = false, pendingReports = 0 }: { isAdmin?: boolean; pendingReports?: number }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav aria-label="Main" className="nav-scroll flex gap-1">
      {(isAdmin ? [...LINKS, { href: "/admin", label: "Organizer" }] : LINKS).map((l) => (
        <Link key={l.href} href={l.href} className="nav-link" aria-current={isActive(l.href) ? "page" : undefined}>
          {l.label}
          {l.href === "/admin" && pendingReports > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-honey px-1.5 text-xs font-extrabold text-night">
              <span className="sr-only">{pendingReports} reports waiting: </span>
              {pendingReports}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
