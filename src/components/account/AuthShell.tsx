import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";

/** The shared frame for sign-in and sign-up: the form on the left, the Woodland Alliance on the right. */
export function AuthShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const style = { "--pattern": "url(/patterns/alliance.webp)" } as CSSProperties;

  return (
    <div className="mx-auto grid max-w-4xl items-stretch gap-6 md:grid-cols-[1fr_0.85fr]">
      <div className="card stitched p-6 sm:p-8">
        <h1 className="text-4xl font-bold">{title}</h1>
        <p className="mt-2 mb-6 text-bark-soft">{intro}</p>
        {children}
      </div>
      <div
        className="relative hidden items-end justify-center overflow-hidden rounded-[1.5rem] border-[1.5px] border-bark/15 bg-parchment-deep/80 shadow-[var(--shadow-card)] md:flex"
        style={style}
        aria-hidden="true"
      >
        <div className="pattern-fade" style={{ WebkitMaskImage: "none", maskImage: "none", opacity: 0.6 }} />
        <Image src="/art/hero.webp" alt="" width={520} height={520} className="relative h-auto w-full max-w-[320px] pb-4" />
      </div>
    </div>
  );
}
