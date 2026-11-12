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

export function SiteNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav aria-label="Main" className="nav-scroll flex gap-1">
      {(isAdmin ? [...LINKS, { href: "/admin", label: "Organizer" }] : LINKS).map((l) => (
        <Link key={l.href} href={l.href} className="nav-link" aria-current={isActive(l.href) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
