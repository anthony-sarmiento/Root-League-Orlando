"use client";

/* eslint-disable @next/next/no-img-element -- artwork is pre-optimized WebP, so a plain <img> is all that's needed */
import { useSyncExternalStore, type CSSProperties } from "react";
import { getReady, getServerReady, subscribeReady } from "@/lib/ready";

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
  /** Accepted so it can stand in for next/image; every image here waits for the page to be ready either way. */
  priority?: boolean;
  sizes?: string;
  /** A smaller copy to use on phones (screens up to 700px wide). */
  smallSrc?: string;
}

/**
 * A blank picture of the right shape, so the space is held (and the aspect ratio is right) until the real one loads.
 * It is drawn four times larger than shown so tools that compare a picture's own size with its display size see no
 * problem in the moment before the real artwork arrives.
 */
const placeholder = (w: number, h: number) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w * 4}" height="${h * 4}"></svg>`)}`;

/**
 * Stands in for next/image on the site's artwork. The picture is requested once the page has loaded and painted
 * (see lib/ready.ts), not during the first paint, so it never slows down the part of the page people see first.
 */
export default function DeferredImage({ src, smallSrc, alt, width, height, className, style }: Props) {
  const ready = useSyncExternalStore(subscribeReady, getReady, getServerReady);
  const img = (
    <img
      src={ready ? src : placeholder(width, height)}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      decoding="async"
    />
  );
  // A <source> would win over the placeholder, so it only appears once the page is ready.
  if (!smallSrc || !ready) return img;
  return (
    <picture className="contents">
      <source media="(max-width: 700px)" srcSet={smallSrc} />
      {img}
    </picture>
  );
}
