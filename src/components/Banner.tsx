import type { CSSProperties, ReactNode } from "react";
import { preload } from "react-dom";
import { Embers } from "@/components/Critters";
import { getFaction, type FactionId } from "@/lib/league";

interface Props {
  /** Which faction's patterned artwork shows through the banner. */
  pattern?: FactionId;
  className?: string;
  /** Sparks drifting up behind the content. */
  embers?: boolean;
  children: ReactNode;
}

/** A full-width dark forest band with a faction pattern behind it. The first thing on every page. */
export function Banner({ pattern = "alliance", className = "", embers = false, children }: Props) {
  const { pattern: src, patternSm: srcSm } = getFaction(pattern);
  // The pattern is a CSS background, which the browser only finds after the stylesheet: ask for it up front. Phones
  // show it small and faint, so they get the small copy (the stylesheet makes the same choice at the same width).
  preload(src, { as: "image", fetchPriority: "high", media: "(min-width: 768px)" });
  preload(srcSm, { as: "image", fetchPriority: "high", media: "(max-width: 767px)" });
  const style = { "--pattern": `url(${src})`, "--pattern-sm": `url(${srcSm})` } as CSSProperties;

  return (
    // -mt-8 pulls the band up under the header, cancelling the page's top padding.
    <header className={`banner bleed -mt-8 ${className}`} style={style}>
      {embers && <Embers count={16} />}
      <div className="shell relative">{children}</div>
    </header>
  );
}
