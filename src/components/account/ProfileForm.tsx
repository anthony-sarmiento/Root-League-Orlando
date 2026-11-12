"use client";

import { startTransition, useActionState, useState } from "react";
import { createProfile, updateProfile, type ProfileState } from "@/app/account/actions";
import { FormMessages } from "@/components/admin/FormMessages";
import { AvatarPicker } from "@/components/account/AvatarPicker";
import { FACTIONS, type Player } from "@/lib/league";
import { BIO_MAX, NAME_MAX } from "@/lib/profile";

interface Props {
  mode: "create" | "edit";
  initial?: Player;
}

export function ProfileForm({ mode, initial }: Props) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    mode === "create" ? createProfile : updateProfile,
    {},
  );
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [name, setName] = useState(initial?.name ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Dispatch manually so React doesn't wipe the form when a check fails.
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
      className="space-y-5"
    >
      <label className="block">
        <span className="text-sm font-bold">Player name</span>
        <input
          name="name"
          required
          maxLength={NAME_MAX}
          autoComplete="nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field mt-1"
        />
        <span className="mt-1 block text-sm text-bark-soft">This is what everyone sees on the leaderboard.</span>
      </label>

      <label className="block">
        <span className="text-sm font-bold">Favorite faction</span>
        <select name="favoriteFaction" defaultValue={initial?.favoriteFaction ?? ""} className="field mt-1">
          <option value="">No favorite yet</option>
          {FACTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-bold">About you</span>
        <textarea
          name="bio"
          maxLength={BIO_MAX}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="How long have you played? Any dream matchups?"
          className="field mt-1"
        />
        <span className="mt-1 block text-right text-sm text-bark-soft tabular">
          {bio.length}/{BIO_MAX}
        </span>
      </label>

      <AvatarPicker name={name} defaultAvatar={initial?.avatar ?? ""} defaultBg={initial?.avatarBg} />

      <FormMessages state={state} />
      <button type="submit" disabled={pending} className="btn">
        {pending ? "Saving…" : mode === "create" ? "Create my profile" : "Save changes"}
      </button>
    </form>
  );
}
