"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Avatar, avatarBackground } from "@/components/Avatar";
import { AVATARS } from "@/lib/avatars.generated";
import { FACTIONS, type FactionId } from "@/lib/league";

const groups = [...new Set(AVATARS.map((a) => a.group))].map((group) => ({
  group,
  avatars: AVATARS.filter((a) => a.group === group),
}));

interface Props {
  name: string;
  defaultAvatar?: string;
  defaultBg?: FactionId;
}

/**
 * Builds the profile picture: a faction background, then a character, with a live preview.
 * Plain radio inputs underneath, so it works with keyboard and screen readers; the choices are
 * submitted as `avatar` and `avatarBg`.
 */
export function AvatarPicker({ name, defaultAvatar = "", defaultBg }: Props) {
  const [avatar, setAvatar] = useState(defaultAvatar);
  const [bg, setBg] = useState<FactionId | "">(defaultBg ?? "");
  const box = useRef<HTMLDivElement>(null);

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
      <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-parchment/70 p-4">
        <Avatar name={name || "You"} avatar={avatar} bg={bgId} size={128} className="shadow-[0_12px_22px_-10px_rgba(75,52,38,0.6)] !border-4" />
        <div>
          <p className="font-display text-xl font-bold">Your profile picture</p>
          <p className="max-w-[34ch] text-sm text-bark-soft">Pick a background, then a character. This is how everyone sees you.</p>
        </div>
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
            <input type="radio" name="avatar" value="" checked={avatar === ""} onChange={() => setAvatar("")} className="sr-only" />
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
                    <input type="radio" name="avatar" value={a.id} checked={avatar === a.id} onChange={() => setAvatar(a.id)} className="sr-only" />
                    <Image
                      src={a.src}
                      alt={a.name}
                      width={220}
                      height={220}
                      className="h-full w-full scale-[1.55] object-cover object-[50%_10%] transition-transform [transform-origin:50%_26%] group-hover:scale-[1.7]"
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
