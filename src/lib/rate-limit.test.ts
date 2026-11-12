import { beforeEach, describe, expect, it } from "vitest";
import { allowAttempt, clientAddress, resetRateLimits } from "./rate-limit";

beforeEach(resetRateLimits);

describe("allowAttempt", () => {
  it("allows up to the limit, then refuses", () => {
    expect([1, 2, 3, 4].map((i) => allowAttempt("k", 3, 1000, i))).toEqual([true, true, true, false]);
  });

  it("lets attempts through again once the window has passed", () => {
    allowAttempt("k", 1, 1000, 0);
    expect(allowAttempt("k", 1, 1000, 500)).toBe(false);
    expect(allowAttempt("k", 1, 1000, 1500)).toBe(true);
  });

  it("counts each key on its own", () => {
    allowAttempt("a", 1, 1000, 0);
    expect(allowAttempt("b", 1, 1000, 1)).toBe(true);
  });

  it("does not count refused attempts against the window", () => {
    allowAttempt("k", 1, 1000, 0);
    for (let t = 1; t < 900; t += 100) allowAttempt("k", 1, 1000, t);
    expect(allowAttempt("k", 1, 1000, 1001)).toBe(true);
  });
});

describe("clientAddress", () => {
  it("uses the first forwarded address", () => {
    expect(clientAddress(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
  });
  it("falls back to x-real-ip, then a shared bucket", () => {
    expect(clientAddress(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientAddress(new Headers())).toBe("unknown");
  });
});
