import Image from "next/image";
import { getFaction, type FactionId } from "@/lib/league";

interface Props {
  faction: FactionId;
  size?: number;
  /** Also show the faction name next to the badge. */
  showName?: boolean;
}

export function FactionBadge({ faction, size = 32, showName = false }: Props) {
  const f = getFaction(faction);

  const badge = (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-bark/40 shadow-[0_2px_0_rgba(75,52,38,.2)]"
      style={{ width: size, height: size, backgroundColor: f.color, fontSize: size * 0.55 }}
      role="img"
      aria-label={f.name}
      title={f.name}
    >
      {f.icon ? (
        <Image src={f.icon} alt="" width={size} height={size} className="rounded-full" />
      ) : (
        <span aria-hidden="true">{f.emoji}</span>
      )}
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
