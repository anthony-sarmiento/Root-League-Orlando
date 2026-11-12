import type { CSSProperties } from "react";
import Image from "@/components/DeferredImage";
import { critterSrc } from "@/lib/critters";
import { imageSize } from "@/lib/image-sizes.generated";

/** Sparks drifting up out of the page. Positions are fixed numbers so server and client agree. */
export function Embers({ count = 18 }: { count?: number }) {
  return (
    <div className="embers" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const x = (i * 53 + 11) % 100;
        const size = 4 + ((i * 7) % 6);
        const duration = 7 + ((i * 5) % 7);
        const delay = -((i * 3) % 11);
        const drift = ((i % 5) - 2) * 18;
        return (
          <span
            key={i}
            className="ember"
            style={{ "--x": `${x}%`, "--s": `${size}px`, "--d": `${duration}s`, "--delay": `${delay}s`, "--drift": `${drift}px` } as CSSProperties}
          />
        );
      })}
    </div>
  );
}

/**
 * One wide piece of Root artwork across the page. Its edges melt into the page, and the corner where the
 * original image carries a printed title is covered by the page's own colour.
 */
export function BannerArt() {
  return (
    <div className="banner-art" aria-hidden="true">
      <Image src="/art/banner.webp" smallSrc="/art/banner-sm.webp" alt="" width={1500} height={513} className="h-auto w-full" />
      <span className="banner-art-cover" />
    </div>
  );
}

interface CrewMember {
  id: string;
  /** Width in px. */
  w: number;
  /** -1 faces left. */
  f?: 1 | -1;
}

/** A few critters standing on the bottom edge of a page header, looking on. */
export function CritterCrew({ members }: { members: CrewMember[] }) {
  return (
    <div className="crew" aria-hidden="true">
      {members.map((m) => (
        <span key={m.id} style={{ width: m.w, "--f": m.f ?? 1 } as CSSProperties}>
          <Image src={critterSrc(m.id)} alt="" width={imageSize(critterSrc(m.id))[0]} height={imageSize(critterSrc(m.id))[1]} className="h-auto w-full" />
        </span>
      ))}
    </div>
  );
}

/** One critter sitting on the top edge of its parent card. The parent must be `position: relative`. */
export function Perch({ id, w = 90, right = "2rem", flip = false }: { id: string; w?: number; right?: string; flip?: boolean }) {
  return (
    <span className="perch" style={{ width: w, right, top: 6, transform: `translateY(-86%) scaleX(${flip ? -1 : 1})` }} aria-hidden="true">
      <Image src={critterSrc(id)} alt="" width={imageSize(critterSrc(id))[0]} height={imageSize(critterSrc(id))[1]} className="h-auto w-full" />
    </span>
  );
}
