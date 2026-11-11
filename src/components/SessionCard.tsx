import { MapPin } from "lucide-react";
import { AttendeeStack } from "@/components/AttendeeStack";
import { RsvpControl } from "@/components/RsvpControl";
import { formatDate } from "@/lib/format";
import type { Player, Session } from "@/lib/league";
import type { RsvpState } from "@/lib/rsvp";

interface Props {
  session: Session;
  attendees: Player[];
  state: RsvpState;
  /** Highlight as the next game night. */
  featured?: boolean;
}

export function SessionCard({ session, attendees, state, featured = false }: Props) {
  const month = formatDate(session.date, { month: "short", day: undefined, year: undefined });
  const day = Number(session.date.slice(8, 10));
  const weekday = formatDate(session.date, { weekday: "long", month: undefined, day: undefined, year: undefined });

  return (
    <article className={`card ${featured ? "stitched" : ""} flex gap-4 p-5`}>
      <div
        className="flex h-[4.5rem] w-16 shrink-0 flex-col items-center overflow-hidden rounded-xl border-2 border-bark/25 bg-paper text-center shadow-[0_3px_6px_-2px_rgba(75,52,38,0.3)]"
        aria-hidden="true"
      >
        <span className="w-full bg-berry py-0.5 text-xs font-bold tracking-wider text-paper uppercase">{month}</span>
        <span className="font-display text-3xl leading-none font-bold tabular pt-1.5">{day}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h3 className="font-display text-xl leading-tight font-bold">
            {weekday}, {formatDate(session.date, { weekday: undefined, year: undefined })}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-bark-soft">
            <span>{session.title}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={15} aria-hidden="true" /> {session.location}
            </span>
          </p>
        </div>
        {state !== "past" || attendees.length > 0 ? <AttendeeStack players={attendees} /> : null}
        <RsvpControl sessionId={session.id} state={state} />
      </div>
    </article>
  );
}
