import type { CSSProperties, ReactNode } from "react";
import { getFaction, type FactionId } from "@/lib/league";

interface Props {
  title: string;
  description?: ReactNode;
  /** Which faction's patterned artwork fades in behind the header. */
  pattern?: FactionId;
  /** Actions or pickers shown under the title. */
  children?: ReactNode;
}

export function PageHeader({ title, description, pattern = "alliance", children }: Props) {
  const style = { "--pattern": `url(${getFaction(pattern).pattern})` } as CSSProperties;

  return (
    <header
      className="relative overflow-hidden rounded-[1.5rem] border-[1.5px] border-bark/15 bg-parchment-deep/80 px-5 py-6 shadow-[var(--shadow-card)] sm:px-8 sm:py-8"
      style={style}
    >
      <div className="pattern-fade" aria-hidden="true" />
      <div className="relative">
        <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-[60ch] text-lg text-bark-soft">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </header>
  );
}
