"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Image from "@/components/DeferredImage";
import { ExternalLink, GripVertical, Search, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { NamePicker } from "@/components/NamePicker";
import { ordinal } from "@/lib/format";
import { FACTIONS, PLACEMENTS, getFaction, type FactionId, type Player } from "@/lib/league";
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
const FACTION_DRAG = "application/x-root-faction";
const FACTION_SEAT_DRAG = "application/x-root-faction-seat";

/**
 * Builds a table: a searchable roster of player profiles and a tray of faction icons, dropped onto the places
 * (1st, 2nd…). Drag a profile or an icon onto a place, drag a seated player (or faction) to another place to swap,
 * or just tap one to give it to the next free place (touch screens don't drag). Each place also has its own name search.
 */
export function TableBuilder({ players, seats, tableSize, onSeatsChange, reporterId, compact = false }: Props) {
  const [query, setQuery] = useState("");
  const [over, setOver] = useState<number | null>(null);

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const seatOf = (id: string) => seats.findIndex((s, i) => i < tableSize && s.playerId === id);
  const factionSeatOf = (id: string) => seats.findIndex((s, i) => i < tableSize && s.faction === id);

  const roster = useMemo(
    () => searchNames(players.map((p) => ({ id: p.id, name: p.name })), query).map((o) => byId.get(o.id)!),
    [players, query, byId],
  );

  const set = (next: Seat[]) => onSeatsChange(next);
  const copy = () => seats.map((s) => ({ ...s }));

  /** Put a player in a place; if they were already seated elsewhere, that place is left empty. */
  const place = (index: number, playerId: string) => {
    const next = copy();
    const from = seatOf(playerId);
    if (from >= 0 && from !== index) next[from].playerId = "";
    next[index].playerId = playerId;
    set(next);
  };

  const clear = (index: number) => set(seats.map((s, i) => (i === index ? { ...s, playerId: "" } : s)));

  const swap = (a: number, b: number) => {
    if (a === b) return;
    const next = copy();
    [next[a].playerId, next[b].playerId] = [next[b].playerId, next[a].playerId];
    set(next);
  };

  /** Tap to seat: the first empty place. */
  const seatNext = (playerId: string) => {
    if (seatOf(playerId) >= 0) return;
    const free = seats.findIndex((s, i) => i < tableSize && !s.playerId);
    if (free >= 0) place(free, playerId);
  };

  /** Give a place a faction; if another place had it, that one is left without. */
  const setFaction = (index: number, faction: string) => {
    const next = copy();
    const from = factionSeatOf(faction);
    if (faction && from >= 0 && from !== index) next[from].faction = "";
    next[index].faction = faction;
    set(next);
  };

  const swapFactions = (a: number, b: number) => {
    if (a === b) return;
    const next = copy();
    [next[a].faction, next[b].faction] = [next[b].faction, next[a].faction];
    set(next);
  };

  /** Tap a faction: the first place that has none yet. */
  const factionNext = (faction: string) => {
    if (factionSeatOf(faction) >= 0) return;
    const free = seats.findIndex((s, i) => i < tableSize && !s.faction);
    if (free >= 0) setFaction(free, faction);
  };

  const onDrop = (e: DragEvent, index: number) => {
    e.preventDefault();
    setOver(null);
    const playerId = e.dataTransfer.getData(PLAYER_DRAG);
    const fromSeat = e.dataTransfer.getData(SEAT_DRAG);
    const faction = e.dataTransfer.getData(FACTION_DRAG);
    const fromFactionSeat = e.dataTransfer.getData(FACTION_SEAT_DRAG);
    if (playerId && byId.has(playerId)) place(index, playerId);
    else if (fromSeat !== "") swap(Number(fromSeat), index);
    else if (faction && FACTIONS.some((f) => f.id === faction)) setFaction(index, faction);
    else if (fromFactionSeat !== "") swapFactions(Number(fromFactionSeat), index);
  };

  const full = seats.slice(0, tableSize).every((s) => s.playerId && s.faction);

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

              <FactionSlot index={i} placement={placement} faction={seat.faction} compact={compact} onClear={() => setFaction(i, "")} />
            </div>
          );
        })}
      </fieldset>

      {/* Faction tray */}
      <section aria-label="Factions" className="space-y-2 rounded-2xl bg-parchment/60 p-3 col-span-full">
        <p className="text-sm font-bold">
          Factions <span className="font-semibold text-bark-soft">· drag one onto a place, or tap it to give it to the next place without one</span>
        </p>
        <ul className={`grid gap-1.5 ${compact ? "grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))]"}`}>
          {FACTIONS.map((f) => {
            const at = factionSeatOf(f.id);
            return (
              <li key={f.id}>
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(FACTION_DRAG, f.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => factionNext(f.id)}
                  aria-label={at >= 0 ? `${f.name}, ${ordinal(at + 1)} place` : `Give ${f.name} to the next place without a faction`}
                  title={f.name}
                  className={`flex w-full cursor-grab flex-col items-center gap-1 rounded-xl border-2 p-1.5 active:cursor-grabbing ${
                    at >= 0 ? "border-moss/40 bg-moss/10" : "border-bark/15 bg-paper hover:border-moss"
                  }`}
                >
                  <span className="relative">
                    <FactionIcon faction={f.id} size={compact ? 36 : 44} />
                    {at >= 0 && (
                      <span className="absolute -top-1 -right-2 rounded-full bg-moss px-1.5 text-[0.7rem] leading-4 font-bold text-white">
                        {ordinal(at + 1)}
                      </span>
                    )}
                  </span>
                  <span className="w-full truncate text-center text-[0.72rem] leading-tight font-semibold">{f.name.split(" ")[0]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** A faction's icon in a ring of its colour. */
function FactionIcon({ faction, size }: { faction: FactionId; size: number }) {
  const f = getFaction(faction);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-paper"
      style={{ width: size, height: size, border: `2.5px solid ${f.color}` }}
    >
      <Image src={f.icon} alt="" width={size} height={size} className="h-full w-full object-contain p-[8%]" />
    </span>
  );
}

/** A place's faction: the chosen icon (draggable to swap with another place), or a drop target waiting for one. */
function FactionSlot({
  index,
  placement,
  faction,
  compact,
  onClear,
}: {
  index: number;
  placement: number;
  faction: string;
  compact: boolean;
  onClear: () => void;
}) {
  const checkRef = useRef<HTMLInputElement>(null);
  const chosen = FACTIONS.find((f) => f.id === faction);

  // Native form validation: submitting without a faction points at this place.
  useEffect(() => {
    checkRef.current?.setCustomValidity(chosen ? "" : "Choose a faction for this place.");
  }, [chosen]);

  return (
    <div className="relative col-span-2 sm:col-span-1">
      <input type="hidden" name={`faction-${index}`} value={faction} />
      {/* Carries the "required" check, which a hidden input can't. */}
      <input
        ref={checkRef}
        tabIndex={-1}
        aria-hidden="true"
        required
        readOnly
        value={faction}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
      {chosen ? (
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(FACTION_SEAT_DRAG, String(index));
            e.dataTransfer.effectAllowed = "move";
          }}
          className="flex min-w-0 cursor-grab items-center gap-2 rounded-xl bg-parchment/70 px-2 py-1 active:cursor-grabbing"
        >
          <FactionIcon faction={chosen.id} size={compact ? 30 : 38} />
          <span className="min-w-0 flex-1 truncate text-sm font-bold">{chosen.name}</span>
          <button
            type="button"
            onClick={onClear}
            aria-label={`Take ${chosen.name} off ${ordinal(placement)} place`}
            className="shrink-0 rounded-full p-1 text-bark-soft hover:bg-bark/10"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p className="rounded-xl border-2 border-dashed border-bark/30 px-3 py-2.5 text-sm text-bark-soft">Drop a faction here</p>
      )}
    </div>
  );
}
