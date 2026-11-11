import { Avatar } from "@/components/Avatar";
import type { Player } from "@/lib/league";

/** Overlapping avatars of who's going, with a plain-text summary underneath for everyone. */
export function AttendeeStack({ players, max = 6 }: { players: Player[]; max?: number }) {
  if (players.length === 0) {
    return <p className="text-sm text-bark-soft">Nobody has joined yet. Be the first!</p>;
  }

  const shown = players.slice(0, max);
  const extra = players.length - shown.length;
  const names = players.map((p) => p.name).join(", ");

  return (
    <div>
      <div className="flex items-center" aria-hidden="true">
        {shown.map((p, i) => (
          <Avatar
            key={p.id}
            name={p.name}
            avatar={p.avatar}
            size={36}
            className={`${i > 0 ? "-ml-2" : ""} ring-2 ring-paper`}
          />
        ))}
        {extra > 0 && (
          <span className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-bark/25 bg-parchment-deep text-xs font-bold ring-2 ring-paper">
            +{extra}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-bark-soft">
        <strong className="text-bark">{players.length} going:</strong> {names}
      </p>
    </div>
  );
}
