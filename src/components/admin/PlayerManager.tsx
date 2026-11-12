"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { deletePlayer, renamePlayer, type FormState } from "@/app/admin/actions";
import { NAME_MAX } from "@/lib/player-name";

export interface ManagedPlayer {
  id: string;
  name: string;
  games: number;
}

function PlayerRow({ player }: { player: ManagedPlayer }) {
  const [renameState, rename, renaming] = useActionState<FormState, FormData>(renamePlayer, {});
  const [removeState, remove, removing] = useActionState<FormState, FormData>(deletePlayer, {});
  const [name, setName] = useState(player.name);
  const changed = name.trim() !== player.name;
  const message = removeState.errors?.[0] ?? renameState.errors?.[0];
  const ok = removeState.ok ?? renameState.ok;

  return (
    <li className="rounded-2xl border-2 border-bark/15 bg-parchment/60 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <form
          action={rename}
          className="flex min-w-0 flex-1 basis-64 items-center gap-2"
          onSubmit={(e) => {
            // Dispatch by hand so React doesn't reset the field if the new name is refused.
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(() => rename(formData));
          }}
        >
          <input type="hidden" name="playerId" value={player.id} />
          <label className="min-w-0 flex-1">
            <span className="sr-only">Name for {player.name}</span>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              autoComplete="off"
              className="field"
            />
          </label>
          <button type="submit" disabled={!changed || renaming} className="btn small">
            {renaming ? "Saving…" : "Rename"}
          </button>
        </form>

        <span className="text-sm whitespace-nowrap text-bark-soft">
          {player.games} {player.games === 1 ? "game" : "games"}
        </span>

        <form
          action={remove}
          onSubmit={(e) => {
            e.preventDefault();
            const message = `Remove ${player.name} from the league?\n\nThis can't be undone.`;
            if (!window.confirm(message)) return;
            const formData = new FormData(e.currentTarget);
            startTransition(() => remove(formData));
          }}
        >
          <input type="hidden" name="playerId" value={player.id} />
          <button
            type="submit"
            disabled={removing || player.games > 0}
            className="btn danger"
            title={player.games > 0 ? "Delete their games first (under Recent games)" : undefined}
          >
            <Trash2 size={16} aria-hidden="true" /> Remove
          </button>
        </form>
      </div>
      {message && (
        <p role="alert" className="mt-2 rounded-xl bg-berry/10 px-3 py-2 text-sm font-semibold text-berry">
          {message}
        </p>
      )}
      {!message && ok && (
        <p role="status" className="mt-2 text-sm font-semibold text-moss-deep">
          {ok}
        </p>
      )}
    </li>
  );
}

/** Every player in the league, with rename and remove. Players with games on record can't be removed. */
export function PlayerManager({ players }: { players: ManagedPlayer[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [players, query]);

  return (
    <div className="space-y-4">
      {players.length > 6 && (
        <label className="relative block max-w-sm">
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
      )}
      {shown.length === 0 ? (
        <p className="text-bark-soft">{players.length === 0 ? "No players yet." : "Nobody matches that search."}</p>
      ) : (
        <ul className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
          {shown.map((p) => (
            // Keyed by name as well, so a rename (or a refresh after one) resets the row's field to the saved value.
            <PlayerRow key={`${p.id}-${p.name}`} player={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
