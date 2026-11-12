import type { ReactNode } from "react";
import { Banner } from "@/components/Banner";
import { CardFan, type CardId } from "@/components/CardFan";
import { Ornament } from "@/components/Ornament";
import type { FactionId } from "@/lib/league";

interface Props {
  title: string;
  description?: ReactNode;
  /** Which faction's patterned artwork shows through the banner. */
  pattern?: FactionId;
  /** Actions or pickers shown under the title. */
  children?: ReactNode;
  /** A small fan of card art tucked into the banner's right side (wide screens). */
  cards?: CardId[];
}

export function PageHeader({ title, description, pattern = "alliance", children, cards }: Props) {
  return (
    <Banner pattern={pattern}>
      {cards && (
        <div className="pointer-events-none absolute right-8 bottom-0 hidden w-[26rem] lg:block">
          <div className="pointer-events-auto">
            <CardFan cards={cards} size="sm" />
          </div>
        </div>
      )}
      <div className="py-10 sm:py-14">
        <h1 className="text-4xl font-bold sm:text-6xl">{title}</h1>
        <Ornament className="mt-3 w-40 text-honey sm:w-56" />
        {description && <p className="mt-4 max-w-[62ch] text-lg text-parchment/85 sm:text-xl lg:max-w-[48ch]">{description}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </Banner>
  );
}
