import type { ReactNode } from "react";
import { Banner } from "@/components/Banner";
import { CritterCrew } from "@/components/Critters";
import { Ornament } from "@/components/Ornament";
import type { FactionId } from "@/lib/league";

interface Props {
  title: string;
  description?: ReactNode;
  /** Which faction's patterned artwork shows through the banner. */
  pattern?: FactionId;
  /** Actions or pickers shown under the title. */
  children?: ReactNode;
  /** Characters standing on the banner's bottom edge, right side (wide screens). */
  crew?: { id: string; w: number; f?: 1 | -1 }[];
}

export function PageHeader({ title, description, pattern = "alliance", children, crew }: Props) {
  return (
    <Banner pattern={pattern}>
      {crew && <CritterCrew members={crew} />}
      <div className="py-10 sm:py-14">
        <h1 className="text-4xl font-bold sm:text-6xl">{title}</h1>
        <Ornament className="mt-3 w-40 text-honey sm:w-56" />
        {description && <p className="mt-4 max-w-[62ch] text-lg text-parchment/85 sm:text-xl lg:max-w-[34ch] xl:max-w-[48ch]">{description}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </Banner>
  );
}
