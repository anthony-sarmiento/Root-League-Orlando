"use client";

import { useEffect, useRef } from "react";
import { turnstileSiteKey } from "@/lib/captcha";

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | undefined;

/** Loads Cloudflare's script once, and only on the pages that have a form that needs it. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not start")));
    script.onerror = () => {
      loading = undefined;
      reject(new Error("Turnstile could not be loaded"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * The "are you human?" check. Turnstile adds a hidden `cf-turnstile-response` field to the surrounding form, which
 * the server action passes to Supabase to verify. Tokens work once, so `resetSignal` (change it after each
 * submission) asks for a fresh one.
 */
export function Turnstile({ resetSignal }: { resetSignal?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!turnstileSiteKey || !box.current) return;
    let cancelled = false;
    const el = box.current;
    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widget.current = api.render(el, { sitekey: turnstileSiteKey, theme: "light", size: "flexible" });
      })
      .catch(() => {
        // Blocked by an extension or network: the form's own message explains that the check is needed.
      });
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (widget.current) window.turnstile?.reset(widget.current);
  }, [resetSignal]);

  if (!turnstileSiteKey) return null;
  return <div ref={box} className="min-h-[65px]" />;
}
