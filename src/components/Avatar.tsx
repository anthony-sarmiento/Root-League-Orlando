import Image from "next/image";
import { getAvatar } from "@/lib/profile";

const FALLBACK_COLORS = ["#5f7d3b", "#c9772f", "#3d8a8c", "#b5443a", "#8a6a2f", "#6a4c93"];

function colorFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

interface Props {
  name: string;
  avatar?: string;
  size?: number;
  className?: string;
}

/** A player's chosen character, or their initial on a woodland colour. Decorative: the name always sits beside it. */
export function Avatar({ name, avatar, size = 44, className = "" }: Props) {
  const art = getAvatar(avatar);
  const style = { width: size, height: size };

  if (art) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-bark/25 bg-[radial-gradient(circle_at_50%_35%,#fffaf0,#eddcb8)] ${className}`}
        style={style}
      >
        <Image src={art.src} alt="" width={size} height={size} className="h-full w-full object-contain p-[6%]" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-bark/25 font-display font-bold text-paper ${className}`}
      style={{ ...style, backgroundColor: colorFor(name), fontSize: size * 0.45 }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
