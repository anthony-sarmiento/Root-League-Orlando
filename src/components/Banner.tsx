import type { CSSProperties, ReactNode } from "react";
import { getFaction, type FactionId } from "@/lib/league";

interface Props {
  /** Which faction's patterned artwork shows through the banner. */
  pattern?: FactionId;
  className?: string;
  children: ReactNode;
}

/** A full-width dark forest band with a faction pattern behind it. The first thing on every page. */
export function Banner({ pattern = "alliance", className = "", children }: Props) {
  const style = { "--pattern": `url(${getFaction(pattern).pattern})` } as CSSProperties;

  return (
    // -mt-8 pulls the band up under the header, cancelling the page's top padding.
    <header className={`banner bleed -mt-8 ${className}`} style={style}>
      <div className="shell">{children}</div>
    </header>
  );
}
