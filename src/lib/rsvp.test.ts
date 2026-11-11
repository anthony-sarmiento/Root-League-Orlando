import { describe, expect, it } from "vitest";
import { rsvpStateFor } from "./rsvp";

const session = { id: "s1", date: "2026-11-19", title: "Root League Night", location: "TBA" };
const me = { player: { id: "p1", name: "Me" } };
const signups = [{ sessionId: "s1", playerId: "p1" }];

describe("rsvpStateFor", () => {
  it("offers nothing for nights that have passed", () => {
    expect(rsvpStateFor(me, session, signups, "2026-11-20")).toBe("past");
  });
  it("treats tonight as still open", () => {
    expect(rsvpStateFor(me, session, [], "2026-11-19")).toBe("not-going");
  });
  it("nudges signed-out visitors to sign up", () => {
    expect(rsvpStateFor(null, session, signups, "2026-11-11")).toBe("signed-out");
  });
  it("asks accounts without a profile to set one up", () => {
    expect(rsvpStateFor({ player: null }, session, signups, "2026-11-11")).toBe("no-profile");
  });
  it("knows whether you're going", () => {
    expect(rsvpStateFor(me, session, signups, "2026-11-11")).toBe("going");
    expect(rsvpStateFor(me, session, [], "2026-11-11")).toBe("not-going");
    expect(rsvpStateFor(me, session, [{ sessionId: "other", playerId: "p1" }], "2026-11-11")).toBe("not-going");
  });
});
