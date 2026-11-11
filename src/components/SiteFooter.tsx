import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t-2 border-dashed border-bark/20 px-4 py-8 text-center text-sm text-bark-soft">
      <div className="mb-3 flex items-end justify-center gap-3" aria-hidden="true">
        <Image src="/art/bunny.webp" alt="" width={28} height={28} />
        <Image src="/art/fox.webp" alt="" width={32} height={32} />
        <Image src="/art/mouse.webp" alt="" width={28} height={28} />
      </div>
      <p className="font-display text-base font-semibold text-bark">May your warriors never wander alone.</p>
      <p className="mx-auto mt-1 max-w-prose">
        Root and its iconography are © Leder Games, used with permission. A fan-run league in Orlando.
      </p>
    </footer>
  );
}
