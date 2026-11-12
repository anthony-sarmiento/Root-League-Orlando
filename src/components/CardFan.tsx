import type { CSSProperties } from "react";
import Image from "next/image";

/** Card art from the Root deck, built into /public/art/cards by scripts/build-assets.mjs. */
export const CARD_IDS = [
  "throne", "talon", "vagabond", "frog", "knave", "mole", "quest", "deck", "exiles", "melee", "turn", "setup", "key",
] as const;
export type CardId = (typeof CARD_IDS)[number];

interface Props {
  cards: CardId[];
  size?: "sm" | "md" | "lg";
  /** Cards bob gently on their own. Use on one big showpiece per page. */
  alive?: boolean;
  className?: string;
}

/** A hand of illustrated cards, fanned out. Purely decorative. */
export function CardFan({ cards, size = "md", alive = false, className = "" }: Props) {
  return (
    <div className={`fan ${size === "md" ? "" : size} ${alive ? "alive" : ""} ${className}`} aria-hidden="true">
      {cards.map((id, i) => (
        <span
          key={id}
          className="fan-card"
          style={{ "--i": i, "--n": cards.length, "--z": i } as CSSProperties}
        >
          <span>
            <Image src={`/art/cards/${id}.webp`} alt="" width={340} height={480} className="h-auto w-full" />
          </span>
        </span>
      ))}
    </div>
  );
}

/** Sparks drifting up out of a dark band. Positions are fixed numbers so server and client agree. */
export function Embers({ count = 18 }: { count?: number }) {
  return (
    <div className="embers" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const x = (i * 53 + 11) % 100;
        const size = 4 + ((i * 7) % 6);
        const duration = 7 + ((i * 5) % 7);
        const delay = -((i * 3) % 11);
        const drift = ((i % 5) - 2) * 18;
        return (
          <span
            key={i}
            className="ember"
            style={{ "--x": `${x}%`, "--s": `${size}px`, "--d": `${duration}s`, "--delay": `${delay}s`, "--drift": `${drift}px` } as CSSProperties}
          />
        );
      })}
    </div>
  );
}
