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

interface Figure {
  id: string;
  /** Left edge and width of the character's box in the 2400-wide artwork. */
  x: number;
  w: number;
  /** Top of the box; characters stand on the bottom of it. */
  y: number;
  /** -1 turns the character to face left. */
  f?: 1 | -1;
  /** Tilt in degrees. */
  r?: number;
}

const GROUND = 760;
const BOX = 560; // every character is drawn in a box this tall, standing on its bottom edge

// Two warbands collide in the middle of the page-wide picture. The left side charges right, the right side
// charges left, and a few leap in from above. Back-to-front.
const FIGURES: Figure[] = [
  { id: "odilie", x: 2020, w: 420, y: 70, f: 1, r: -12 },
  { id: "ubade-mo-set", x: 1600, w: 400, y: 40, f: 1, r: -10 },
  { id: "sergeant-atheldrydd", x: 20, w: 420, y: GROUND - 440, f: 1, r: -6 },
  { id: "captain-ismay", x: 520, w: 420, y: 70, f: 1, r: 14 },
  { id: "commander-vauquelin", x: 250, w: 560, y: GROUND - BOX, f: 1, r: -3 },
  { id: "captain-hersilia", x: 1420, w: 500, y: GROUND - BOX + 30, f: 1, r: -4 },
  { id: "duke-whitetalon", x: 1840, w: 600, y: GROUND - BOX - 40, f: -1, r: 3 },
  { id: "camdyn", x: 700, w: 500, y: GROUND - BOX + 10, f: 1, r: 4 },
  { id: "thief", x: 1000, w: 380, y: 10, f: 1, r: 18 },
  { id: "arbiter", x: 1180, w: 400, y: 30, f: -1, r: -14 },
];

/** A page-wide piece of art: critters from every corner of the woodland piling into one big fight. */
export function Panorama() {
  return (
    <svg className="panorama" viewBox={`0 0 2400 ${GROUND + 110}`} role="img" aria-label="Woodland critters from every faction crashing into a big brawl">
      <defs>
        <radialGradient id="dust" cx="40%" cy="35%" r="65%">
          <stop offset="0" stopColor="#fff4de" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#d6be96" stopOpacity="0.6" />
          <stop offset="1" stopColor="#d6be96" stopOpacity="0" />
        </radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="14" stdDeviation="10" floodColor="#000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* dust along the ground where they collide */}
      {[
        [1040, 720, 210],
        [1200, 700, 260],
        [1370, 724, 200],
        [820, 735, 150],
        [1560, 735, 150],
      ].map(([cx, cy, r]) => (
        <ellipse key={cx} cx={cx} cy={cy} rx={r} ry={r * 0.55} fill="url(#dust)" filter="url(#soft)" />
      ))}

      {/* the clash */}
      <g transform="translate(1200 330) scale(1.12)">
        <polygon
          points="0,-300 56,-120 214,-216 130,-52 290,0 130,52 214,216 56,120 0,300 -56,120 -214,216 -130,52 -290,0 -130,-52 -214,-216 -56,-120"
          fill="#f2c868"
          stroke="#3a1a14"
          strokeWidth="14"
          strokeLinejoin="round"
        />
        <polygon
          points="0,-170 34,-68 124,-124 76,-30 170,0 76,30 124,124 34,68 0,170 -34,68 -124,124 -76,30 -170,0 -76,-30 -124,-124 -34,-68"
          fill="#fff6dc"
          opacity="0.92"
        />
      </g>

      {FIGURES.map((f) => {
        const cx = f.x + f.w / 2;
        const cy = f.y + BOX;
        const flip = f.f === -1 ? `translate(${cx * 2} 0) scale(-1 1) ` : "";
        return (
          <g key={f.id} filter="url(#shadow)" transform={`${flip}rotate(${f.r ?? 0} ${cx} ${cy})`}>
            <image
              href={critterSrc(f.id)}
              x={f.x}
              y={f.y}
              width={f.w}
              height={BOX}
              preserveAspectRatio="xMidYMax meet"
            />
          </g>
        );
      })}

      {/* sparks */}
      {[
        [980, 250, 7], [1420, 210, 9], [1130, 120, 6], [1290, 150, 8], [900, 420, 6], [1560, 380, 7], [1210, 560, 6],
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#ffe3a3" opacity="0.9" />
      ))}
    </svg>
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
