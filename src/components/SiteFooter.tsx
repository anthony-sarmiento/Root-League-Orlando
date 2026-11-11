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
    <footer className="band-dark after:hidden mt-16 px-4 pt-12 pb-10 text-center sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5">
        <div className="flex items-end justify-center gap-4" aria-hidden="true">
          <Image src="/art/bunny.webp" alt="" width={40} height={40} />
          <Image src="/art/fox.webp" alt="" width={46} height={46} />
          <Image src="/art/mouse.webp" alt="" width={40} height={40} />
        </div>
        <p className="font-display text-2xl font-bold text-[#f2c868]">May your warriors never wander alone.</p>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-bold">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="underline decoration-parchment/40 underline-offset-4 hover:decoration-honey">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="max-w-prose text-sm text-parchment/75">
          Root and its iconography are © Leder Games, used with permission. A fan-run league in Orlando.
        </p>
      </div>
    </footer>
  );
}
