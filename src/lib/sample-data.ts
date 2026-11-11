import { FACTIONS, type Game, type Placement, type Player, type Session } from "./league";

/**
 * Deterministic made-up league data, used until Supabase is connected.
 * Same output every run so pages don't flicker between reloads.
 */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20261111);

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const ROSTER: { name: string; strength: number }[] = [
  { name: "Bramble", strength: 1.4 },
  { name: "Thistle", strength: 1.1 },
  { name: "Juniper", strength: 0.9 },
  { name: "Fennel", strength: 0.7 },
  { name: "Hazel", strength: 0.5 },
  { name: "Sorrel", strength: 0.3 },
  { name: "Rowan", strength: 0.1 },
  { name: "Mossy", strength: 0 },
];

const players: Player[] = ROSTER.map((p) => ({
  id: `p-${p.name.toLowerCase()}`,
  name: p.name,
}));
const strengthOf = new Map(ROSTER.map((p, i) => [players[i].id, p.strength]));

const PAST_DATES = [
  "2026-09-03", "2026-09-10", "2026-09-17", "2026-09-24",
  "2026-10-01", "2026-10-08", "2026-10-15", "2026-10-22", "2026-10-29",
  "2026-11-03", "2026-11-05", "2026-11-10",
];
const UPCOMING_DATES = ["2026-11-12", "2026-11-19"];

const sessions: Session[] = [...PAST_DATES, ...UPCOMING_DATES].map((date, i) => ({
  id: `s-${i + 1}`,
  date,
  title: "Root League Night",
  location: "Location TBA",
}));

const games: Game[] = [];
for (const session of sessions.filter((s) => PAST_DATES.includes(s.date))) {
  const seated = shuffle(players);
  for (let table = 0; table < 2; table++) {
    const group = seated.slice(table * 4, table * 4 + 4);
    const factions = shuffle(FACTIONS).slice(0, 4);
    // Stronger players tend to finish higher, with plenty of upsets.
    const order = group
      .map((p, i) => ({ p, faction: factions[i].id, score: (strengthOf.get(p.id) ?? 0) + rng() * 1.8 }))
      .sort((a, b) => b.score - a.score);
    games.push({
      id: `g-${session.id}-${table + 1}`,
      playedOn: session.date,
      sessionId: session.id,
      results: order.map((o, i) => ({
        playerId: o.p.id,
        faction: o.faction,
        placement: (i + 1) as Placement,
      })),
    });
  }
}

export const sampleData = { players, sessions, games };
