import Image from "@/components/DeferredImage";
import { getFaction, type FactionId } from "@/lib/league";

interface Props {
  faction: FactionId;
  size?: number;
  /** Also show the faction name next to the badge. */
  showName?: boolean;
}

/** The faction's official head icon in a ring of its colour. The name is always available to screen readers. */
export function FactionBadge({ faction, size = 32, showName = false }: Props) {
  const f = getFaction(faction);

  const badge = (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-paper shadow-[0_2px_4px_rgba(75,52,38,0.2)]"
      style={{ width: size, height: size, border: `2.5px solid ${f.color}` }}
      role={showName ? undefined : "img"}
      aria-label={showName ? undefined : f.name}
      aria-hidden={showName ? true : undefined}
      title={showName ? undefined : f.name}
    >
      <Image src={f.icon} alt="" width={size} height={size} className="h-full w-full object-contain p-[8%]" />
    </span>
  );

  if (!showName) return badge;
  return (
    <span className="inline-flex items-center gap-2">
      {badge}
      <span className="font-semibold">{f.name}</span>
    </span>
  );
}
