"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { connectAccount, mergePlayers, type FormState } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import { FormMessages } from "./FormMessages";
import { RevealEmail } from "./RevealEmail";

export interface AccountRow {
  userId: string;
  /** The address with most of it hidden; the full one is fetched on request. */
  emailMasked: string;
  createdAt: string;
  playerId: string | null;
  playerName: string | null;
}

export interface NamedPlayer {
  id: string;
  name: string;
  games: number;
}

function AccountItem({ account, players }: { account: AccountRow; players: NamedPlayer[] }) {
  const [state, connect, pending] = useActionState<FormState, FormData>(connectAccount, {});
  const [target, setTarget] = useState("");
  const current = players.find((p) => p.id === account.playerId);
  const chosen = players.find((p) => p.id === target);

  const confirmText = () => {
    if (!chosen) return "";
    if (!account.playerId) return `Connect ${account.emailMasked || "this account"} to ${chosen.name}?\n\nThey will be able to edit that profile and RSVP as them.`;
    if (account.playerId === target) return "";
    return (
      `Connect ${account.emailMasked || "this account"} to ${chosen.name}?\n\n` +
      `${account.playerName ?? "Their current profile"} (${current?.games ?? 0} games) will be merged into ${chosen.name}: ` +
      `its games, RSVPs and reports move over, blank details are filled in from it, and ${account.playerName ?? "it"} is removed.\n\n` +
      `This can't be undone.`
    );
  };

  return (
    <li className="rounded-2xl border-2 border-bark/15 bg-parchment/60 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="font-bold"><RevealEmail userId={account.userId} masked={account.emailMasked} /></p>
          <p className="text-sm text-bark-soft">
            Joined {formatDate(account.createdAt.slice(0, 10))} ·{" "}
            {account.playerName ? (
              <>
                is <strong className="text-bark">{account.playerName}</strong> ({current?.games ?? 0}{" "}
                {(current?.games ?? 0) === 1 ? "game" : "games"})
              </>
            ) : (
              "no profile yet"
            )}
          </p>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const message = confirmText();
            if (!message) return;
            if (!window.confirm(message)) return;
            const formData = new FormData(e.currentTarget);
            startTransition(() => connect(formData));
          }}
        >
          <input type="hidden" name="userId" value={account.userId} />
          <label>
            <span className="sr-only">Name to connect {account.emailMasked} to</span>
            <select name="playerId" required value={target} onChange={(e) => setTarget(e.target.value)} className="field min-w-48">
              <option value="">Connect to a name…</option>
              {players
                .filter((p) => p.id !== account.playerId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.games} {p.games === 1 ? "game" : "games"})
                  </option>
                ))}
            </select>
          </label>
          <button type="submit" disabled={pending || !target} className="btn small">
            {pending ? "Connecting…" : "Connect"}
          </button>
        </form>
      </div>
      <FormMessages state={state} />
    </li>
  );
}

/** Pick any account and any name and join them: for people who made a second account or a duplicate profile. */
export function AccountConnector({ accounts, players }: { accounts: AccountRow[]; players: NamedPlayer[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => !q || a.emailMasked.toLowerCase().includes(q) || (a.playerName ?? "").toLowerCase().includes(q));
  }, [accounts, query]);

  return (
    <div className="space-y-4">
      {accounts.length > 6 && (
        <label className="relative block max-w-sm">
          <span className="sr-only">Find an account by name</span>
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-bark-soft" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find by name"
            className="field"
            style={{ paddingLeft: "2.6rem" }}
          />
        </label>
      )}
      {shown.length === 0 ? (
        <p className="text-bark-soft">{accounts.length === 0 ? "No accounts yet." : "Nobody matches that search."}</p>
      ) : (
        <ul className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
          {shown.map((a) => (
            <AccountItem key={`${a.userId}-${a.playerId}`} account={a} players={players} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Two names that are really one person (neither needs an account): fold the duplicate into the one to keep. */
export function MergePlayersForm({ players }: { players: NamedPlayer[] }) {
  const [state, merge, pending] = useActionState<FormState, FormData>(mergePlayers, {});
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const from = players.find((p) => p.id === source);
  const into = players.find((p) => p.id === target);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!from || !into) return;
        const message =
          `Merge ${from.name} (${from.games} games) into ${into.name} (${into.games} games)?\n\n` +
          `All of ${from.name}'s games, RSVPs and reports move to ${into.name}, any account connected to ${from.name} ` +
          `moves too, and ${from.name} is removed. This can't be undone.`;
        if (!window.confirm(message)) return;
        const formData = new FormData(e.currentTarget);
        startTransition(() => merge(formData));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold">Duplicate (goes away)</span>
          <select name="sourceId" required value={source} onChange={(e) => setSource(e.target.value)} className="field mt-1">
            <option value="">Pick the duplicate…</option>
            {players
              .filter((p) => p.id !== target)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.games} {p.games === 1 ? "game" : "games"})
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-bold">Name to keep</span>
          <select name="targetId" required value={target} onChange={(e) => setTarget(e.target.value)} className="field mt-1">
            <option value="">Pick the name to keep…</option>
            {players
              .filter((p) => p.id !== source)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.games} {p.games === 1 ? "game" : "games"})
                </option>
              ))}
          </select>
        </label>
      </div>
      <FormMessages state={state} />
      <button type="submit" disabled={pending || !source || !target} className="btn">
        {pending ? "Merging…" : "Merge these two"}
      </button>
    </form>
  );
}
