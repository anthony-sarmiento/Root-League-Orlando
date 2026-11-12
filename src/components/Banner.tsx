import type { CSSProperties, ReactNode } from "react";
import { Embers } from "@/components/CardFan";
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
  const style = { "--pattern": `url(${getFaction(pattern).pattern})` } as CSSProperties;

  return (
    // -mt-8 pulls the band up under the header, cancelling the page's top padding.
    <header className={`banner bleed -mt-8 ${className}`} style={style}>
      {embers && <Embers count={16} />}
      <div className="shell relative">{children}</div>
    </header>
  );
}
