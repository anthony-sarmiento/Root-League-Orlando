import { MapPin, Users } from "lucide-react";
import { AttendeeStack } from "@/components/AttendeeStack";
import { Perch } from "@/components/Critters";
import { RsvpControl } from "@/components/RsvpControl";
import { TableSeats } from "@/components/TableSeats";
import { formatDate } from "@/lib/format";
import { PLAYERS_PER_GAME, type Player, type Session } from "@/lib/league";
import type { RsvpState } from "@/lib/rsvp";
import { daysBetween, todayISO } from "@/lib/seasons";

interface Props {
  session: Session;
  attendees: Player[];
  state: RsvpState;
  /** The next game night: bigger, and the RSVPs are drawn as tables of four. */
  featured?: boolean;
}

/** "Today", "Tomorrow" or "In 5 days". */
export function whenLabel(date: string, today = todayISO()): string {
  const days = daysBetween(today, date);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function SessionCard({ session, attendees, state, featured = false }: Props) {
  const month = formatDate(session.date, { month: "short", day: undefined, year: undefined });
  const day = Number(session.date.slice(8, 10));
  const weekday = formatDate(session.date, { weekday: "long", month: undefined, day: undefined, year: undefined });
  const fullTables = Math.floor(attendees.length / PLAYERS_PER_GAME);
  const upcoming = state !== "past";

  return (
    <article className={`card ${featured ? "stitched" : ""} flex gap-5 p-5 sm:p-6`}>
      {featured && upcoming && <Perch id="squire-dye" w={96} right="2.5rem" />}
      <div
        className={`plaque flex shrink-0 flex-col items-center overflow-hidden rounded-2xl text-center ${featured ? "h-28 w-24" : "h-24 w-[4.75rem]"}`}
        aria-hidden="true"
      >
        <span className="w-full bg-berry py-1 text-xs font-bold tracking-wider text-paper uppercase">{month}</span>
        <span className={`font-display pt-2 leading-none font-bold tabular ${featured ? "text-5xl" : "text-4xl"}`}>{day}</span>
        <span className="mt-1 text-[0.7rem] font-bold tracking-wide text-bark-soft uppercase">{weekday.slice(0, 3)}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          {upcoming && (
            <p className="mb-1 inline-flex rounded-full bg-moss/15 px-2.5 py-0.5 text-sm font-bold text-moss-deep">
              {whenLabel(session.date)}
            </p>
          )}
          <h3 className="font-display text-2xl leading-tight font-bold">
            {weekday}, {formatDate(session.date, { weekday: undefined, year: undefined })}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-bark-soft">
            <span className="font-semibold text-bark">{session.title}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={16} aria-hidden="true" /> {session.location}
            </span>
          </p>
        </div>
        {upcoming && (
          <p className="flex items-start gap-1.5 text-sm text-bark-soft">
            <Users size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Several tables can run at once, each seating {PLAYERS_PER_GAME}.
              {fullTables > 0 && (
                <>
                  {" "}
                  <strong className="text-bark">
                    {attendees.length} going is enough for {fullTables} full {fullTables === 1 ? "table" : "tables"}.
                  </strong>
                </>
              )}
            </span>
          </p>
        )}
        {featured && upcoming ? (
          <TableSeats players={attendees} />
        ) : state !== "past" || attendees.length > 0 ? (
          <AttendeeStack players={attendees} />
        ) : null}
        <RsvpControl sessionId={session.id} state={state} />
      </div>
    </article>
  );
}
