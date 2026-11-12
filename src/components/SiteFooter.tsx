import Image from "next/image";
import Link from "next/link";

const LINKS = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/sessions", label: "Game nights" },
  { href: "/players", label: "Players" },
  { href: "/factions", label: "Factions" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 px-4 pt-12 pb-12 text-center sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5">
        <div className="flex items-end justify-center gap-4" aria-hidden="true">
          <Image src="/art/bunny.webp" alt="" width={40} height={40} className="footer-folk" />
          <Image src="/art/fox.webp" alt="" width={46} height={46} className="footer-folk" />
          <Image src="/art/mouse.webp" alt="" width={40} height={40} className="footer-folk" />
        </div>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-bold">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="draw-link">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/admin" className="draw-link text-sm font-bold">
          Organizer login
        </Link>
        <p className="max-w-prose text-sm text-parchment/75">
          Root and its iconography are © Leder Games. A fan-run league in Orlando.
        </p>
      </div>
    </footer>
  );
}
