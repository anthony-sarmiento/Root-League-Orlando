import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t-2 border-dashed border-bark/20 px-4 py-6 text-center text-sm text-bark-soft">
      <p className="font-display text-base font-semibold text-bark">🍄 May your warriors never wander alone 🍄</p>
      <p className="mt-1">
        Root and its iconography are © Leder Games, used with permission. A fan-run league.
      </p>
      <p className="mt-2">
        <Link
          href="/admin"
          className="font-semibold underline decoration-leaf decoration-2 underline-offset-4 hover:text-moss-deep"
        >
          Organizer login
        </Link>
      </p>
    </footer>
  );
}
