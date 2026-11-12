"use client";

import { useEffect } from "react";
import { markReady } from "@/lib/ready";

/** How long after the page has loaded to start fetching fonts and decorative images. */
const SETTLE_MS = 200;

/** Marks the page ready shortly after it has loaded (see lib/ready.ts). Renders nothing. */
export function ReadyOnLoad() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      timer = setTimeout(markReady, SETTLE_MS);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      clearTimeout(timer);
    };
  }, []);
  return null;
}
