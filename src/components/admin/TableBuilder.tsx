"use client";

import { useMemo, useState, type DragEvent } from "react";
import { ExternalLink, GripVertical, Search, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { NamePicker } from "@/components/NamePicker";
import { ordinal } from "@/lib/format";
import { FACTIONS, PLACEMENTS, type Player } from "@/lib/league";
import { searchNames } from "@/lib/name-search";

export interface Seat {
  playerId: string;
  faction: string;
}

interface Props {
  players: Player[];
  seats: Seat[];
  tableSize: number;
  onSeatsChange: (seats: Seat[]) => void;
  /** The signed-in player, marked "(you)" when reporting. */
  reporterId?: string;
  /** Tighter layout for the organizer page. */
  compact?: boolean;
}

const PLAYER_DRAG = "application/x-root-player";
const SEAT_DRAG = "application/x-root-seat";

/**
 * Builds a table: a searchable roster of player profiles on one side, the places (1st, 2nd…) on the other.
 * Drag a profile onto a place, drag a seated player to another place to swap, or just tap a name to seat them in the
 * next free place (touch screens don't drag). Each place also has its own name search.
 */
export function TableBuilder({ players, seats, tableSize, onSeatsChange, reporterId, compact = false }: Props) {
  const [query, setQuery] = useState("");
  const [over, setOver] = useState<number | null>(null);

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const seatOf = (id: string) => seats.findIndex((s, i) => i < tableSize && s.playerId === id);
  const takenFactions = new Set(seats.slice(0, tableSize).map((s) => s.faction).filter(Boolean));

  const roster = useMemo(
    () => searchNames(players.map((p) => ({ id: p.id, name: p.name })), query).map((o) => byId.get(o.id)!),
    [players, query, byId],
  );

  const set = (next: Seat[]) => onSeatsChange(next);

  /** Put a player in a place; if they were already seated elsewhere, that place is left empty. */
  const place = (index: number, playerId: string) => {
    const next = seats.map((s) => ({ ...s }));
    const from = seatOf(playerId);
    if (from >= 0 && from !== index) next[from].playerId = "";
    next[index].playerId = playerId;
    set(next);
  };

  const clear = (index: number) => set(seats.map((s, i) => (i === index ? { ...s, playerId: "" } : s)));

  const swap = (a: number, b: number) => {
    if (a === b) return;
    const next = seats.map((s) => ({ ...s }));
    [next[a], next[b]] = [next[b], next[a]];
    set(next);
  };

  /** Tap to seat: the first empty place. */
  const seatNext = (playerId: string) => {
    if (seatOf(playerId) >= 0) return;
    const free = seats.findIndex((s, i) => i < tableSize && !s.playerId);
    if (free >= 0) place(free, playerId);
  };

  const onDrop = (e: DragEvent, index: number) => {
    e.preventDefault();
    setOver(null);
    const playerId = e.dataTransfer.getData(PLAYER_DRAG);
    const fromSeat = e.dataTransfer.getData(SEAT_DRAG);
    if (playerId && byId.has(playerId)) place(index, playerId);
    else if (fromSeat !== "") swap(Number(fromSeat), index);
  };

  const full = seats.slice(0, tableSize).every((s) => s.playerId);

  return (
    <div className={`grid gap-4 ${compact ? "md:grid-cols-[13rem_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)]"}`}>
      {/* Roster */}
      <section aria-label="Players" className="space-y-2 rounded-2xl bg-parchment/60 p-3">
        <label className="relative block">
          <span className="sr-only">Search the roster</span>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-bark-soft" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter picks the top match instead of submitting the form.
              if (e.key === "Enter") {
                e.preventDefault();
                if (roster[0]) seatNext(roster[0].id);
              }
            }}
            placeholder="Search players…"
            className="field"
            style={{ paddingLeft: "2.25rem" }}
          />
        </label>
        <p className="text-xs text-bark-soft">Drag a player to a place, or tap a name to seat them.</p>
        <ul className={`grid gap-1.5 overflow-y-auto pr-1 ${compact ? "max-h-40 sm:grid-cols-2 md:grid-cols-1" : "max-h-80"}`}>
          {roster.length === 0 && <li className="px-2 py-3 text-sm text-bark-soft">No one by that name.</li>}
          {roster.map((p) => {
            const seated = seatOf(p.id);
            return (
              <li key={p.id} className="flex items-center gap-1">
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(PLAYER_DRAG, p.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => seatNext(p.id)}
                  aria-label={seated >= 0 ? `${p.name}, seated in ${ordinal(seated + 1)}` : `Seat ${p.name} in the next free place`}
                  className={`flex min-w-0 flex-1 cursor-grab items-center gap-2 rounded-xl border-2 px-2 py-1 text-left active:cursor-grabbing ${
                    seated >= 0 ? "border-moss/40 bg-moss/10" : "border-bark/15 bg-paper hover:border-moss"
                  }`}
                >
                  <Avatar name={p.name} avatar={p.avatar} bg={p.avatarBg} crop={p.avatarCrop} size={compact ? 28 : 34} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {p.name}
                    {p.id === reporterId && <span className="ml-1 font-semibold text-bark-soft">(you)</span>}
                  </span>
                  {seated >= 0 && <span className="shrink-0 text-xs font-bold text-moss-deep">{ordinal(seated + 1)}</span>}
                </button>
                <a
                  href={`/players/${p.id}`}
                  target="_blank"
                  rel="noopener"
                  aria-label={`Open ${p.name}'s profile in a new tab`}
                  title="Open profile"
                  className="shrink-0 rounded-full p-1.5 text-bark-soft hover:bg-bark/10 hover:text-moss-deep"
                >
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      {/* The table */}
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-bold">
          Results, in finishing order {full && <span className="font-semibold text-moss-deep">· table is full</span>}
        </legend>
        {PLACEMENTS.slice(0, tableSize).map((placement, i) => {
          const seat = seats[i] ?? { playerId: "", faction: "" };
          const player = byId.get(seat.playerId);
          return (
            <div
              key={placement}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(i);
              }}
              onDragLeave={() => setOver((o) => (o === i ? null : o))}
              onDrop={(e) => onDrop(e, i)}
              className={`grid items-center gap-2 rounded-2xl border-2 p-2 ${compact ? "grid-cols-[2.5rem_minmax(0,1fr)]" : "grid-cols-[2.75rem_minmax(0,1fr)]"} sm:grid-cols-[2.75rem_minmax(0,1.4fr)_minmax(0,1fr)] ${
                over === i ? "border-moss bg-moss/15" : player ? "border-bark/20 bg-paper/70" : "border-dashed border-bark/30"
              }`}
            >
              <span className="font-title text-xl font-bold text-acorn-deep">{ordinal(placement)}</span>
              <input type="hidden" name={`player-${i}`} value={seat.playerId} />

              {player ? (
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(SEAT_DRAG, String(i));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className="flex min-w-0 cursor-grab items-center gap-2 rounded-xl bg-parchment/70 px-2 py-1 active:cursor-grabbing"
                >
                  <GripVertical size={16} className="shrink-0 text-bark-soft" aria-hidden="true" />
                  <Avatar name={player.name} avatar={player.avatar} bg={player.avatarBg} crop={player.avatarCrop} size={compact ? 30 : 38} />
                  <a href={`/players/${player.id}`} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate font-bold hover:text-moss-deep">
                    {player.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => clear(i)}
                    aria-label={`Take ${player.name} out of ${ordinal(placement)} place`}
                    className="shrink-0 rounded-full p-1 text-bark-soft hover:bg-bark/10"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <NamePicker
                  name={`search-${i}`}
                  label={`${ordinal(placement)} place player`}
                  placeholder="Drop a player here, or search…"
                  value=""
                  onChange={(id) => id && place(i, id)}
                  options={players.map((p) => ({
                    id: p.id,
                    name: p.name,
                    hint: p.id === reporterId ? "(you)" : seatOf(p.id) >= 0 ? "at this table" : undefined,
                    disabled: seatOf(p.id) >= 0,
                  }))}
                />
              )}

              <select
                name={`faction-${i}`}
                aria-label={`${ordinal(placement)} place faction`}
                className="field col-span-2 sm:col-span-1"
                value={seat.faction}
                onChange={(e) => set(seats.map((s, idx) => (idx === i ? { ...s, faction: e.target.value } : s)))}
                required
              >
                <option value="">Faction…</option>
                {FACTIONS.map((f) => (
                  <option key={f.id} value={f.id} disabled={takenFactions.has(f.id) && seat.faction !== f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </fieldset>
    </div>
  );
}
