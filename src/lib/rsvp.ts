import type { Session, Signup } from "./league";
import type { Viewer } from "./viewer";

export type RsvpState = "signed-out" | "no-profile" | "going" | "not-going" | "past";

/** What the RSVP control should offer this visitor for a given game night. */
export function rsvpStateFor(
  viewer: Pick<Viewer, "player"> | null,
  session: Session,
  signups: Signup[],
  today: string,
): RsvpState {
  if (session.date < today) return "past";
  if (!viewer) return "signed-out";
  if (!viewer.player) return "no-profile";
  const going = signups.some((s) => s.sessionId === session.id && s.playerId === viewer.player!.id);
  return going ? "going" : "not-going";
}
