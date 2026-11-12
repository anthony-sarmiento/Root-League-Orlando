import Image from "next/image";
import { getFaction, type FactionId } from "@/lib/league";
import type { AvatarCrop } from "@/lib/league";
import { cropStyle, getAvatar } from "@/lib/profile";

const FALLBACK_COLORS = ["#5f7d3b", "#c9772f", "#3d8a8c", "#b5443a", "#8a6a2f", "#6a4c93"];

function colorFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

interface Props {
  name: string;
  avatar?: string;
  /** The faction whose pattern sits behind the portrait. */
  bg?: FactionId;
  /** Where the character sits in the circle; a flattering default when not set. */
  crop?: AvatarCrop;
  size?: number;
  className?: string;
}

/** The background a portrait sits on: a faction's pattern, or a warm paper glow. */
export function avatarBackground(bg?: FactionId): { backgroundImage: string; backgroundSize?: string; borderColor?: string } {
  if (!bg) return { backgroundImage: "radial-gradient(circle at 50% 35%, #fffaf0, #eddcb8)" };
  const faction = getFaction(bg);
  return {
    // A soft light from above keeps the character readable on busy patterns.
    backgroundImage: `radial-gradient(circle at 50% 30%, rgba(255,250,240,0.35), transparent 65%), url(${faction.pattern})`,
    backgroundSize: "auto, 260%",
    borderColor: faction.color,
  };
}

/**
 * A player's chosen character, cropped in close like a profile picture, on their chosen faction background.
 * With no art it shows their initial. Decorative: the name always sits beside it.
 */
export function Avatar({ name, avatar, bg, crop, size = 44, className = "" }: Props) {
  const art = getAvatar(avatar);
  const look = avatarBackground(bg);
  const style = {
    width: size,
    height: size,
    backgroundImage: look.backgroundImage,
    backgroundSize: look.backgroundSize,
    backgroundPosition: "center",
    ...(look.borderColor ? { borderColor: look.borderColor } : {}),
  };

  if (art) {
    return (
      <span
        aria-hidden="true"
        className={`relative inline-flex shrink-0 overflow-hidden rounded-full border-2 border-bark/25 ${className}`}
        style={style}
      >
        {/* The whole portrait, uncropped, unless the player has zoomed or moved it. */}
        <Image
          src={art.src}
          alt=""
          width={Math.max(size * 2, 128)}
          height={Math.max(size * 2, 128)}
          className="h-full w-full object-contain"
          style={cropStyle(crop)}
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-bark/25 font-display font-bold text-paper ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        backgroundColor: colorFor(name),
        ...(bg ? { backgroundImage: look.backgroundImage, backgroundSize: look.backgroundSize, backgroundBlendMode: "multiply" } : {}),
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
