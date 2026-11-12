import type { CSSProperties } from "react";
import Image from "next/image";
import { critterSrc } from "@/lib/critters";

/** Sparks drifting up out of the page. Positions are fixed numbers so server and client agree. */
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

interface Fighter {
  id: string;
  /** Horizontal centre, percent of the stage. */
  x: number;
  /** Distance from the stage floor, px. */
  b: number;
  /** Width, px. */
  w: number;
  /** -1 turns the character to face left. */
  f?: 1 | -1;
  /** Tilt in degrees. */
  r?: number;
  z?: number;
  /** Seconds for one scuffle swing, and a start offset. */
  d?: number;
  delay?: number;
  /** Skipped on phones. */
  desktopOnly?: boolean;
}

// Two warbands collide in the middle. Left side charges right, right side charges left; a few leap in from above.
const FIGHTERS: Fighter[] = [
  { id: "commander-vauquelin", x: 13, b: 0, w: 210, f: 1, r: -3, z: 4, d: 2.1 },
  { id: "camdyn", x: 32, b: 6, w: 190, f: 1, r: 4, z: 6, d: 1.8, delay: -0.6 },
  { id: "captain-ismay", x: 24, b: 120, w: 170, f: 1, r: 14, z: 5, d: 2.6, delay: -1, desktopOnly: true },
  { id: "sergeant-atheldrydd", x: 7, b: 40, w: 150, f: 1, r: -8, z: 3, d: 2.3, desktopOnly: true },
  { id: "duke-whitetalon", x: 87, b: 0, w: 230, f: -1, r: 3, z: 4, d: 2, delay: -0.3 },
  { id: "captain-hersilia", x: 67, b: 6, w: 200, f: 1, r: -4, z: 6, d: 1.9, delay: -0.9 },
  { id: "odilie", x: 94, b: 150, w: 150, f: 1, r: -12, z: 3, d: 2.7, delay: -0.2, desktopOnly: true },
  { id: "ubade-mo-set", x: 77, b: 130, w: 160, f: 1, r: -10, z: 5, d: 2.4, delay: -1.4, desktopOnly: true },
  { id: "arbiter", x: 59, b: 170, w: 150, f: -1, r: -16, z: 7, d: 2.2, delay: -0.5, desktopOnly: true },
  { id: "thief", x: 47, b: 210, w: 140, f: 1, r: 18, z: 8, d: 1.7, delay: -1.1, desktopOnly: true },
];

/** A cartoon brawl: critters from every corner of the woodland piling into one another around a dust-up. */
export function BrawlScene() {
  return (
    <div className="brawl" aria-hidden="true">
      {/* dust and a starburst where they meet */}
      {[
        { l: "44%", b: "4%", s: 150, d: "0s" },
        { l: "52%", b: "10%", s: 190, d: "-0.5s" },
        { l: "36%", b: "2%", s: 120, d: "-1s" },
        { l: "60%", b: "3%", s: 130, d: "-0.3s" },
      ].map((p, i) => (
        <span key={i} className="puff" style={{ left: p.l, bottom: p.b, width: p.s, height: p.s * 0.8, "--delay": p.d } as CSSProperties} />
      ))}
      <svg className="clash" viewBox="0 0 200 200">
        <polygon
          points="100,6 118,62 172,30 142,84 196,100 142,116 172,170 118,138 100,194 82,138 28,170 58,116 4,100 58,84 28,30 82,62"
          fill="#f2c868"
          stroke="#3a1a14"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <polygon
          points="100,40 112,76 148,58 130,92 160,100 130,108 148,142 112,124 100,160 88,124 52,142 70,108 40,100 70,92 52,58 88,76"
          fill="#fff6dc"
          opacity="0.9"
        />
      </svg>
      {FIGHTERS.map((f) => (
        <span
          key={f.id}
          className={`fighter ${f.desktopOnly ? "desktop-only" : ""}`}
          style={
            {
              "--x": `${f.x}%`,
              "--b": `${f.b}px`,
              "--w": `${f.w}px`,
              "--f": f.f ?? 1,
              "--r": `${f.r ?? 0}deg`,
              "--z": f.z ?? 1,
              "--d": `${f.d ?? 2.4}s`,
              "--delay": `${f.delay ?? 0}s`,
            } as CSSProperties
          }
        >
          <span>
            <Image src={critterSrc(f.id)} alt="" width={320} height={320} className="h-auto w-full" />
          </span>
        </span>
      ))}
    </div>
  );
}

interface CrewMember {
  id: string;
  /** Width in px. */
  w: number;
  /** -1 faces left. */
  f?: 1 | -1;
}

/** A few critters standing on the bottom edge of a page header, looking on. */
export function CritterCrew({ members }: { members: CrewMember[] }) {
  return (
    <div className="crew" aria-hidden="true">
      {members.map((m) => (
        <span key={m.id} style={{ width: m.w, "--f": m.f ?? 1 } as CSSProperties}>
          <Image src={critterSrc(m.id)} alt="" width={320} height={320} className="h-auto w-full" />
        </span>
      ))}
    </div>
  );
}

/** One critter sitting on the top edge of its parent card. The parent must be `position: relative`. */
export function Perch({ id, w = 90, right = "2rem", flip = false }: { id: string; w?: number; right?: string; flip?: boolean }) {
  return (
    <span className="perch" style={{ width: w, right, top: 6, transform: `translateY(-86%) scaleX(${flip ? -1 : 1})` }} aria-hidden="true">
      <Image src={critterSrc(id)} alt="" width={320} height={320} className="h-auto w-full" />
    </span>
  );
}
