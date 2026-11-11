"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { AVATARS } from "@/lib/avatars.generated";

const groups = [...new Set(AVATARS.map((a) => a.group))].map((group) => ({
  group,
  avatars: AVATARS.filter((a) => a.group === group),
}));

/** A scrollable gallery of character portraits. Plain radio inputs, so it works with keyboard and screen readers. */
export function AvatarPicker({ defaultValue = "" }: { defaultValue?: string }) {
  const box = useRef<HTMLDivElement>(null);

  // Start with the current choice in view instead of leaving it buried further down the list.
  useEffect(() => {
    const container = box.current;
    const checked = container?.querySelector<HTMLInputElement>("input:checked");
    const label = checked?.closest("label");
    if (container && label && defaultValue) {
      container.scrollTop = label.offsetTop - container.offsetTop - 12;
    }
  }, [defaultValue]);

  return (
    <fieldset>
      <legend className="text-sm font-bold">Your character</legend>
      <p className="mt-0.5 mb-2 text-sm text-bark-soft">Pick the portrait that shows up next to your name.</p>

      <div ref={box} className="relative max-h-80 overflow-y-auto rounded-2xl border-2 border-bark/20 bg-parchment/60 p-3">
        <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 rounded-full border-2 border-bark/15 bg-paper px-3 py-1 text-sm font-bold has-[:checked]:border-moss has-[:checked]:bg-moss/15 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-acorn">
          <input type="radio" name="avatar" value="" defaultChecked={defaultValue === ""} className="sr-only" />
          Just my initial for now
        </label>

        {groups.map(({ group, avatars }) => (
          <div key={group} className="mb-3 last:mb-0">
            <h4 className="mb-1.5 text-sm font-bold text-bark-soft">{group}</h4>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] gap-2">
              {avatars.map((a) => (
                <label
                  key={a.id}
                  title={a.name}
                  className="relative flex aspect-square cursor-pointer items-center justify-center rounded-xl border-2 border-bark/15 bg-paper transition-transform hover:-translate-y-0.5 has-[:checked]:border-moss has-[:checked]:bg-moss/15 has-[:checked]:ring-2 has-[:checked]:ring-moss has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-acorn"
                >
                  <input type="radio" name="avatar" value={a.id} defaultChecked={defaultValue === a.id} className="sr-only" />
                  <Image src={a.src} alt={a.name} width={64} height={64} className="h-full w-full object-contain p-1.5" />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
