import { describe, expect, it } from "vitest";
import { siteOrigin } from "./site-url";

describe("siteOrigin", () => {
  it("prefers the configured address, dropping any path", () => {
    expect(siteOrigin(new Headers({ host: "evil.test" }), "https://rootleague.example/some/path/")).toBe("https://rootleague.example");
  });

  it("works out the address from the request when nothing is configured", () => {
    expect(siteOrigin(new Headers({ host: "rootleague.vercel.app" }), undefined)).toBe("https://rootleague.vercel.app");
    expect(siteOrigin(new Headers({ "x-forwarded-host": "rootleague.example", "x-forwarded-proto": "https", host: "internal" }), undefined)).toBe(
      "https://rootleague.example",
    );
  });

  it("uses plain http only for local development", () => {
    expect(siteOrigin(new Headers({ host: "localhost:3000" }), undefined)).toBe("http://localhost:3000");
    expect(siteOrigin(new Headers({ host: "rootleague.example", "x-forwarded-proto": "http" }), undefined)).toBe("http://rootleague.example");
  });

  it("ignores a malformed configured address", () => {
    expect(siteOrigin(new Headers({ host: "rootleague.example" }), "not a url")).toBe("https://rootleague.example");
  });
});
