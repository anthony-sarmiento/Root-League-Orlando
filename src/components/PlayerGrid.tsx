"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { FactionBadge } from "@/components/FactionBadge";
import { pct } from "@/lib/format";
import { getFaction, type AvatarCrop, type FactionId } from "@/lib/league";
import { getAvatar } from "@/lib/profile";

export interface PlayerCardData {
  id: string;
  name: string;
  bio?: string;
  avatar?: string;
  avatarBg?: FactionId;
  avatarCrop?: AvatarCrop;
  games: number;
  wins: number;
  winrate: number;
  /** All-time league points. */
  lp: number;
  /** League points in the current (or most recent) season. */
  seasonLp: number;
  seasonName: string;
  /** Favorite faction if they set one, otherwise their best. */
  faction?: FactionId;
  factionIsFavorite: boolean;
}

const SORTS = [
  { id: "lp", label: "Total LP", cmp: (a: PlayerCardData, b: PlayerCardData) => b.lp - a.lp },
  { id: "season", label: "Season LP", cmp: (a: PlayerCardData, b: PlayerCardData) => b.seasonLp - a.seasonLp || b.lp - a.lp },
  { id: "games", label: "Most games", cmp: (a: PlayerCardData, b: PlayerCardData) => b.games - a.games },
  { id: "wins", label: "Most wins", cmp: (a: PlayerCardData, b: PlayerCardData) => b.wins - a.wins },
  { id: "winrate", label: "Win rate", cmp: (a: PlayerCardData, b: PlayerCardData) => b.winrate - a.winrate || b.games - a.games },
  { id: "name", label: "A to Z", cmp: (a: PlayerCardData, b: PlayerCardData) => a.name.localeCompare(b.name) },
] as const;

/** The roster: every player as a collectible card on their own faction's colors. Search, sort, filter by faction. */
export function PlayerGrid({ players }: { players: PlayerCardData[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("lp");
  const [faction, setFaction] = useState<FactionId | "all">("all");

  // Only offer factions somebody actually plays or loves.
  const factionsInUse = useMemo(() => {
    const seen = new Set(players.map((p) => p.faction).filter(Boolean) as FactionId[]);
    return [...seen].map(getFaction);
  }, [players]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cmp = SORTS.find((s) => s.id === sort)!.cmp;
    return players
      .filter((p) => (!q || p.name.toLowerCase().includes(q)) && (faction === "all" || p.faction === faction))
      .sort((a, b) => cmp(a, b) || a.name.localeCompare(b.name));
  }, [players, query, sort, faction]);

  const filtering = query.trim() !== "" || faction !== "all";

  return (
    <div className="space-y-8">
      {players.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center -space-x-3" aria-hidden="true">
            {players.slice(0, 10).map((p) => (
              <span key={p.id} className="rounded-full ring-[3px] ring-parchment">
                <Avatar name={p.name} avatar={p.avatar} bg={p.avatarBg} crop={p.avatarCrop} size={46} />
              </span>
            ))}
          </div>
          <p className="font-title text-xl font-bold">
            {players.length} {players.length === 1 ? "player" : "players"} in the league
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Find a player</span>
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-bark-soft" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a player"
              className="field"
              style={{ paddingLeft: "2.6rem" }}
            />
          </label>
          <div className="seg" role="group" aria-label="Sort players">
            {SORTS.map((s) => (
              <button key={s.id} type="button" aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {factionsInUse.length > 1 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by faction">
            <button type="button" className={`chip ${faction === "all" ? "active" : ""}`} onClick={() => setFaction("all")}>
              All factions
            </button>
            {factionsInUse.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`chip ${faction === f.id ? "active" : ""}`}
                aria-pressed={faction === f.id}
                onClick={() => setFaction(faction === f.id ? "all" : f.id)}
              >
                <Image src={f.icon} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                {f.name}
              </button>
            ))}
          </div>
        )}

        <p className="text-sm text-parchment/70" role="status">
          Showing {shown.length} of {players.length}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="card p-8 text-center text-bark-soft">
          {players.length === 0
            ? "No players have joined yet. Once someone makes a profile, they'll gather here."
            : filtering
              ? "Nobody matches that search. Try another name or faction."
              : "Nobody here yet."}
        </p>
      ) : (
        <ul className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => {
            const f = getFaction(p.faction ?? "alliance");
            const art = getAvatar(p.avatar);
            const bg = getFaction(p.avatarBg ?? p.faction ?? "alliance");
            const style = {
              "--pattern": `url(${bg.pattern})`,
              "--tint": f.color,
              "--lean": `${[-0.9, 0.7, -0.5, 0.9][i % 4]}deg`,
            } as CSSProperties;
            return (
              <li key={p.id}>
                <Link href={`/players/${p.id}`} className="trade-card" style={style}>
                  <div className="trade-art">
                    {p.faction && (
                      <span className="absolute top-3 right-3 z-10">
                        <FactionBadge faction={p.faction} size={40} />
                      </span>
                    )}
                    {art ? (
                      <Image
                        src={art.src}
                        alt=""
                        width={320}
                        height={320}
                        className="portrait mx-auto h-full w-full scale-[1.12] object-contain [transform-origin:50%_30%]"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center font-title text-7xl font-bold text-parchment/90">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="trade-plate">
                    <h2 className="truncate font-title text-2xl font-bold">{p.name}</h2>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 px-5 pt-4 pb-5">
                    <dl className="grid grid-cols-2 gap-2">
                      <div className="lp-cell">
                        <dt>Total LP</dt>
                        <dd className="tabular">{p.lp}</dd>
                      </div>
                      <div className="lp-cell">
                        <dt>{p.seasonName} LP</dt>
                        <dd className="tabular">{p.seasonLp}</dd>
                      </div>
                    </dl>
                    <dl className="grid grid-cols-3 gap-2 border-b-2 border-dashed border-bark/15 pb-3">
                      <div className="stat-cell">
                        <dt>Games</dt>
                        <dd className="tabular">{p.games}</dd>
                      </div>
                      <div className="stat-cell">
                        <dt>Wins</dt>
                        <dd className="tabular">{p.wins}</dd>
                      </div>
                      <div className="stat-cell">
                        <dt>Win rate</dt>
                        <dd className="tabular">{p.games === 0 ? "–" : pct(p.winrate)}</dd>
                      </div>
                    </dl>
                    {p.bio ? <p className="line-clamp-2 text-sm">{p.bio}</p> : <p className="text-sm text-bark-soft">No bio yet.</p>}
                    {p.faction && (
                      <p className="mt-auto text-sm">
                        <span className="text-bark-soft">{p.factionIsFavorite ? "Favorite: " : "Best: "}</span>
                        <strong>{f.name}</strong>
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
