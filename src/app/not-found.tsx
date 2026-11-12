import Image from "next/image"; // this page is served without scripts, so it can't use the deferred loader
import Link from "next/link";

/** Shown for any address that doesn't exist. It needs no scripts, so it works even where the page can't hydrate. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-16 text-center">
      <Image src="/art/fox.webp" alt="" width={96} height={96} className="mx-auto h-auto w-24" />
      <h1 className="text-5xl font-bold">Lost in the woods</h1>
      <p className="text-lg text-parchment/85">That page doesn&apos;t exist, or it has moved. Let&apos;s get you back on the path.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn acorn">Back to the home page</Link>
        <Link href="/leaderboard" className="btn secondary">See the standings</Link>
      </div>
    </div>
  );
}
