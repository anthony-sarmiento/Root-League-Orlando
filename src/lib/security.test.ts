import { describe, expect, it } from "vitest";
import { buildCsp } from "./csp";
import { isUuid, maskEmail } from "./email";
import { validatePassword } from "./password";

describe("validatePassword", () => {
  it("accepts a long, ordinary passphrase", () => {
    expect(validatePassword("correct horse battery staple", "a@b.test")).toEqual([]);
  });

  it("needs ten characters", () => {
    expect(validatePassword("short1")[0]).toMatch(/at least 10/);
  });

  it("refuses the passwords attackers try first", () => {
    expect(validatePassword("Password123!")[0]).toMatch(/first ones attackers try/); // decoration doesn't help
    expect(validatePassword("password123")[0]).toMatch(/first ones attackers try/);
    expect(validatePassword("qwertyuiop123")).toEqual([]); // long and not exactly a list entry
    expect(validatePassword("passwordpassword")).toEqual([]);
  });

  it("refuses repeats, runs and thin character sets", () => {
    expect(validatePassword("aaaaaaaaaaaa")[0]).toMatch(/one character repeated/);
    expect(validatePassword("0123456789")[0]).toMatch(/in order/);
    expect(validatePassword("abababababab")[0]).toMatch(/wider mix/);
  });

  it("refuses a password that contains the email name", () => {
    expect(validatePassword("alexander-2026-woods", "alexander@example.test")[0]).toMatch(/email name/);
  });

  it("caps the length", () => {
    expect(validatePassword("x".repeat(200) + "y1")[0]).toMatch(/under 128/);
  });
});

describe("maskEmail", () => {
  it("hides most of the address but keeps the shape", () => {
    expect(maskEmail("alex.smith@gmail.com")).toBe("a••••@g••••.com");
    expect(maskEmail("jo@x.org")).toBe("j••@x••.org");
  });

  it("never returns the original text", () => {
    const masked = maskEmail("someone.private@mail.example.com");
    expect(masked).not.toContain("someone");
    expect(masked).not.toContain("private");
  });

  it("copes with odd input", () => {
    expect(maskEmail("")).toBe("");
    expect(maskEmail(null)).toBe("");
    expect(maskEmail("not-an-email")).toBe("•••");
  });
});

describe("isUuid", () => {
  it("accepts UUIDs and nothing else", () => {
    expect(isUuid("0b6f6d52-7e0e-4a53-9f4c-2f8f6a0c1d11")).toBe(true);
    expect(isUuid("0b6f6d52-7e0e-4a53-9f4c-2f8f6a0c1d11' or 1=1")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});

describe("buildCsp", () => {
  it("allows scripts only with the nonce, and forbids framing and plugins", () => {
    const csp = buildCsp("abc123");
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-eval/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toMatch(/connect-src 'self'(;|$)/);
    expect(csp).toContain("img-src 'self' blob: data:");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("loosens only what development needs", () => {
    const csp = buildCsp("abc123", { dev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("names Cloudflare's frame only when the CAPTCHA is on", () => {
    expect(buildCsp("n")).not.toContain("challenges.cloudflare.com");
    const csp = buildCsp("n", { captcha: true });
    expect(csp).toContain("frame-src https://challenges.cloudflare.com");
    expect(csp).toMatch(/script-src 'self' 'nonce-n' 'strict-dynamic'(;|$)/);
  });

  it("only lets the browser talk to this site (the database is reached from the server)", () => {
    expect(buildCsp("n")).not.toMatch(/supabase/);
    expect(buildCsp("n")).toMatch(/connect-src 'self'(;|$)/);
  });
});
