import type { ReactNode } from "react";
import { Ornament } from "@/components/Ornament";

interface Props {
  title: ReactNode;
  description?: ReactNode;
  /** A link or control aligned to the right of the heading. */
  action?: ReactNode;
  /** Use on dark bands. */
  onDark?: boolean;
}

export function SectionHeading({ title, description, action, onDark = false }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
        <Ornament className={`mt-2 w-36 ${onDark ? "text-honey" : "text-moss"}`} />
        {description && (
          <p className={`mt-3 max-w-[60ch] ${onDark ? "text-parchment/80" : "text-bark-soft"}`}>{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
