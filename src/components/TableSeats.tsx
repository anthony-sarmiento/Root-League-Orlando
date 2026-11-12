import type { CSSProperties } from "react";
import { Avatar } from "@/components/Avatar";
import { PLAYERS_PER_GAME, type Player } from "@/lib/league";

const MAX_TABLES = 6;

/**
 * Who's going, drawn as the tables they'd fill: four seats to a table, a new table once the last one is full.
 * It shows at a glance how many games the night can run. The names are listed in text for everyone.
 */
export function TableSeats({ players }: { players: Player[] }) {
  if (players.length === 0) {
    return (
      <div className="space-y-2">
        <Table seats={[]} number={1} />
        <p className="text-sm text-bark-soft">Nobody has joined yet. Be the first to take a seat!</p>
      </div>
    );
  }

  const tableCount = Math.ceil(players.length / PLAYERS_PER_GAME);
  const shownTables = Math.min(tableCount, MAX_TABLES);
  const hidden = Math.max(0, players.length - shownTables * PLAYERS_PER_GAME);
  const names = players.map((p) => p.name).join(", ");

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: shownTables }, (_, t) => (
          <Table
            key={t}
            number={t + 1}
            seats={players.slice(t * PLAYERS_PER_GAME, (t + 1) * PLAYERS_PER_GAME)}
            offset={t * PLAYERS_PER_GAME}
          />
        ))}
      </div>
      {hidden > 0 && <p className="text-sm font-bold text-bark-soft">+{hidden} more going</p>}
      <p className="text-sm text-bark-soft">
        <strong className="text-bark">{players.length} going:</strong> {names}
      </p>
    </div>
  );
}

function Table({ seats, number, offset = 0 }: { seats: Player[]; number: number; offset?: number }) {
  const open = PLAYERS_PER_GAME - seats.length;
  return (
    <div className="rounded-2xl border-2 border-bark/15 bg-parchment/70 p-3">
      <p className="mb-2 text-xs font-bold tracking-wide text-bark-soft uppercase">
        Table {number}
        {open > 0 && seats.length > 0 && <span className="ml-2 font-semibold normal-case">{open} open</span>}
      </p>
      <div className="flex items-center gap-2" aria-hidden="true">
        {seats.map((p, i) => (
          <span key={p.id} className="seat" style={{ "--i": offset + i } as CSSProperties}>
            <Avatar name={p.name} avatar={p.avatar} bg={p.avatarBg} crop={p.avatarCrop} size={44} />
          </span>
        ))}
        {Array.from({ length: open }, (_, i) => (
          <span
            key={`open-${i}`}
            className="h-11 w-11 shrink-0 rounded-full border-2 border-dashed border-bark/30"
          />
        ))}
      </div>
    </div>
  );
}
