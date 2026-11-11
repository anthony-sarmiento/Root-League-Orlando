"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateProfile, type ProfileInput } from "@/lib/profile";
import { createServerSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export interface ProfileState {
  ok?: string;
  errors?: string[];
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

function readProfile(formData: FormData): ProfileInput {
  return {
    name: text(formData, "name"),
    bio: text(formData, "bio"),
    favoriteFaction: text(formData, "favoriteFaction"),
    avatar: text(formData, "avatar"),
  };
}

const refresh = () => revalidatePath("/", "layout");

export async function createProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.player) return { errors: ["You already have a profile."] };

  const { clean, errors } = validateProfile(readProfile(formData));
  if (errors.length) return { errors };

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("create_my_profile", {
    p_name: clean.name,
    p_bio: clean.bio,
    p_favorite_faction: clean.favoriteFaction,
    p_avatar: clean.avatar,
  });
  if (error) {
    console.error("[create-profile] failed:", error.code, error.message);
    if (error.code === "23505") {
      return {
        errors: [`The name "${clean.name}" is already taken. If that's you, claim it below instead of making a new profile.`],
      };
    }
    return { errors: ["Couldn't create your profile. Please try again."] };
  }

  refresh();
  redirect("/account");
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.player) return { errors: ["Create your profile first."] };

  const { clean, errors } = validateProfile(readProfile(formData));
  if (errors.length) return { errors };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("players")
    .update({
      name: clean.name,
      bio: clean.bio || null,
      favorite_faction: clean.favoriteFaction || null,
      avatar: clean.avatar || null,
    })
    .eq("id", viewer.player.id)
    .select("id");

  if (error) {
    console.error("[update-profile] failed:", error.code, error.message);
    return { errors: [error.code === "23505" ? `The name "${clean.name}" is already taken.` : "Couldn't save your profile."] };
  }
  if (!data || data.length === 0) return { errors: ["Couldn't save your profile."] };

  refresh();
  return { ok: "Profile saved." };
}

export async function submitClaim(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.player) return { errors: ["You already have a profile."] };

  const playerId = text(formData, "playerId");
  const note = text(formData, "note").trim();
  if (!playerId) return { errors: ["Choose the name that's yours."] };
  if (note.length > 280) return { errors: ["Keep your note under 280 characters."] };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("player_claims")
    .insert({ user_id: viewer.userId, player_id: playerId, note: note || null });
  if (error) {
    console.error("[claim] failed:", error.code, error.message);
    if (error.code === "23505") return { errors: ["You already have a pending claim. Withdraw it first to pick a different name."] };
    return { errors: ["Couldn't send your claim. That name may already belong to someone."] };
  }

  refresh();
  return { ok: "Claim sent! An organizer will confirm it, usually at the next game night." };
}

export async function withdrawClaim(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const supabase = await createServerSupabase();
  await supabase.from("player_claims").delete().eq("user_id", viewer.userId);
  refresh();
}
