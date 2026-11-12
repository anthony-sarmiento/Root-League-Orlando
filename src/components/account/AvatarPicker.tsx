"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Image from "next/image";
import { Avatar, avatarBackground } from "@/components/Avatar";
import { AVATARS } from "@/lib/avatars.generated";
import { FACTIONS, type AvatarCrop, type FactionId } from "@/lib/league";
import { DEFAULT_CROP, ZOOM_MAX, ZOOM_MIN, cropStyle } from "@/lib/profile";

const groups = [...new Set(AVATARS.map((a) => a.group))].map((group) => ({
  group,
  avatars: AVATARS.filter((a) => a.group === group),
}));

interface Props {
  name: string;
  defaultAvatar?: string;
  defaultBg?: FactionId;
  defaultCrop?: AvatarCrop;
}

const PREVIEW = 160;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Builds the profile picture: a faction background, then a character, with a live preview.
 * Plain radio inputs underneath, so it works with keyboard and screen readers; the choices are
 * submitted as `avatar`, `avatarBg` and, once the character has been moved, `avatarX`, `avatarY`, `avatarZoom`.
 * The preview can be dragged to move the character; sliders do the same for keyboard and precision.
 */
export function AvatarPicker({ name, defaultAvatar = "", defaultBg, defaultCrop }: Props) {
  const [avatar, setAvatar] = useState(defaultAvatar);
  const [bg, setBg] = useState<FactionId | "">(defaultBg ?? "");
  const [crop, setCrop] = useState<AvatarCrop>(defaultCrop ?? DEFAULT_CROP);
  // Only send a position once the player has actually moved the character.
  const [moved, setMoved] = useState(Boolean(defaultCrop));
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const update = (patch: Partial<AvatarCrop>) => {
    setCrop((c) => ({ ...c, ...patch }));
    setMoved(true);
  };
  const reset = () => {
    setCrop(DEFAULT_CROP);
    setMoved(false);
  };
  const choose = (id: string) => {
    setAvatar(id);
    reset(); // every character sits differently, so start each one from the default
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!avatar) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is only a nicety: dragging still works while the pointer stays over the picture.
    }
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    // Dragging the picture one way moves the point at its centre the other way.
    const scale = (PREVIEW * crop.zoom) / 100;
    const dx = ((e.clientX - drag.current.x) / scale) * 100;
    const dy = ((e.clientY - drag.current.y) / scale) * 100;
    drag.current = { x: e.clientX, y: e.clientY };
    setCrop((c) => ({ ...c, x: clamp(Math.round(c.x - dx), 0, 100), y: clamp(Math.round(c.y - dy), 0, 100) }));
    setMoved(true);
  };
  const onUp = () => {
    drag.current = null;
  };

  // Start with the current character in view instead of leaving it buried further down the list.
  useEffect(() => {
    const container = box.current;
    const label = container?.querySelector<HTMLInputElement>("input[name=avatar]:checked")?.closest("label");
    if (container && label && defaultAvatar) {
      container.scrollTop = (label as HTMLElement).offsetTop - container.offsetTop - 12;
    }
  }, [defaultAvatar]);

  const bgId = bg === "" ? undefined : bg;
  const tileLook = avatarBackground(bgId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-parchment/70 p-4">
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className={`shrink-0 touch-none select-none ${avatar ? "cursor-grab active:cursor-grabbing" : ""}`}
          title={avatar ? "Drag to move your character" : undefined}
        >
          <Avatar
            name={name || "You"}
            avatar={avatar}
            bg={bgId}
            crop={crop}
            size={PREVIEW}
            className="shadow-[0_12px_22px_-10px_rgba(75,52,38,0.6)] !border-4"
          />
        </div>
        <div className="min-w-0 flex-1 basis-60 space-y-3">
          <div>
            <p className="font-display text-xl font-bold">Your profile picture</p>
            <p className="text-sm text-bark-soft">
              {avatar ? "Drag the picture, or use the sliders, to line your character up." : "Pick a background, then a character."}
            </p>
          </div>
          {avatar && (
            <div className="space-y-2">
              {(
                [
                  { label: "Left and right", value: crop.x, min: 0, max: 100, set: (v: number) => update({ x: v }) },
                  { label: "Up and down", value: crop.y, min: 0, max: 100, set: (v: number) => update({ y: v }) },
                  { label: "Zoom", value: crop.zoom, min: ZOOM_MIN, max: ZOOM_MAX, set: (v: number) => update({ zoom: v }) },
                ] as const
              ).map((c) => (
                <label key={c.label} className="flex items-center gap-3 text-sm font-bold">
                  <span className="w-28 shrink-0">{c.label}</span>
                  <input
                    type="range"
                    min={c.min}
                    max={c.max}
                    value={c.value}
                    onChange={(e) => c.set(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer accent-[#4b6a2c]"
                  />
                </label>
              ))}
              <button type="button" onClick={reset} className="btn secondary small" disabled={!moved}>
                Reset position
              </button>
            </div>
          )}
        </div>
        {moved && avatar && (
          <>
            <input type="hidden" name="avatarX" value={crop.x} />
            <input type="hidden" name="avatarY" value={crop.y} />
            <input type="hidden" name="avatarZoom" value={crop.zoom} />
          </>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-bold">Background</legend>
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-2">
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-bark/20 bg-paper p-1 text-center text-xs font-bold has-[:checked]:border-moss has-[:checked]:ring-2 has-[:checked]:ring-moss has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-acorn">
            <input type="radio" name="avatarBg" value="" checked={bg === ""} onChange={() => setBg("")} className="sr-only" />
            Plain
          </label>
          {FACTIONS.map((f) => (
            <label
              key={f.id}
              title={f.name}
              className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-bark/20 transition-transform hover:-translate-y-0.5 has-[:checked]:border-moss has-[:checked]:ring-2 has-[:checked]:ring-moss has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-acorn"
              style={{ backgroundImage: `url(${f.pattern})`, backgroundSize: "300%", backgroundPosition: "center" } as CSSProperties}
            >
              <input type="radio" name="avatarBg" value={f.id} checked={bg === f.id} onChange={() => setBg(f.id)} className="sr-only" />
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper/95 shadow-sm">
                <Image src={f.icon} alt={f.name} width={28} height={28} className="h-7 w-7 object-contain" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-bold">Character</legend>
        <div ref={box} className="relative mt-2 max-h-[26rem] overflow-y-auto rounded-2xl border-2 border-bark/20 bg-parchment/60 p-3">
          <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 rounded-full border-2 border-bark/15 bg-paper px-3 py-1 text-sm font-bold has-[:checked]:border-moss has-[:checked]:bg-moss/15 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-acorn">
            <input type="radio" name="avatar" value="" checked={avatar === ""} onChange={() => choose("")} className="sr-only" />
            Just my initial for now
          </label>

          {groups.map(({ group, avatars }) => (
            <div key={group} className="mb-4 last:mb-0">
              <h4 className="mb-1.5 text-sm font-bold text-bark-soft">{group}</h4>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3">
                {avatars.map((a) => (
                  <label
                    key={a.id}
                    title={a.name}
                    className="group relative block aspect-square cursor-pointer overflow-hidden rounded-2xl border-2 border-bark/20 transition-transform hover:-translate-y-0.5 has-[:checked]:border-moss has-[:checked]:ring-4 has-[:checked]:ring-moss/60 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-acorn"
                    style={{ backgroundImage: tileLook.backgroundImage, backgroundSize: tileLook.backgroundSize, backgroundPosition: "center" }}
                  >
                    <input type="radio" name="avatar" value={a.id} checked={avatar === a.id} onChange={() => choose(a.id)} className="sr-only" />
                    <Image
                      src={a.src}
                      alt={a.name}
                      width={220}
                      height={220}
                      className="h-full w-full object-cover"
                      style={cropStyle()}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
