"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/lib/email";
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
    avatarBg: text(formData, "avatarBg"),
    avatarX: text(formData, "avatarX"),
    avatarY: text(formData, "avatarY"),
    avatarZoom: text(formData, "avatarZoom"),
  };
}

const refresh = () => revalidatePath("/", "layout");

const numberOrNull = (value: string) => (value === "" ? null : Number(value));
function cropColumns(clean: { avatarX: string; avatarY: string; avatarZoom: string }) {
  return {
    avatar_x: numberOrNull(clean.avatarX),
    avatar_y: numberOrNull(clean.avatarY),
    avatar_zoom: numberOrNull(clean.avatarZoom),
  };
}

// Postgres/PostgREST codes for "that column doesn't exist": the avatar-background migration hasn't been run.
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);

async function myPlayerId(supabase: Awaited<ReturnType<typeof createServerSupabase>>, userId: string) {
  const { data } = await supabase.from("player_accounts").select("player_id").eq("user_id", userId).maybeSingle();
  return data?.player_id ?? "";
}

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

  // The background and position live in their own columns, so they are saved separately: a database that hasn't
  // had those migrations yet still creates the profile.
  const playerId = await myPlayerId(supabase, viewer.userId);
  if (clean.avatarBg) await supabase.from("players").update({ avatar_bg: clean.avatarBg }).eq("id", playerId);
  if (clean.avatarX || clean.avatarY || clean.avatarZoom) await supabase.from("players").update(cropColumns(clean)).eq("id", playerId);

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
  const fields = {
    name: clean.name,
    bio: clean.bio || null,
    favorite_faction: clean.favoriteFaction || null,
    avatar: clean.avatar || null,
  };
  const save = (extra: object) =>
    supabase.from("players").update({ ...fields, ...extra }).eq("id", viewer.player!.id).select("id");
  let { data, error } = await save({ avatar_bg: clean.avatarBg || null, ...cropColumns(clean) });
  if (error && MISSING_COLUMN.has(error.code ?? "")) {
    // Position migration not run yet: save without it.
    ({ data, error } = await save({ avatar_bg: clean.avatarBg || null }));
  }
  if (error && MISSING_COLUMN.has(error.code ?? "")) {
    // Background migration not run either: save everything else.
    ({ data, error } = await save({}));
  }

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

  const playerId = text(formData, "playerId");
  const note = text(formData, "note").trim();
  if (!playerId || !isUuid(playerId)) return { errors: ["Choose the name that's yours."] };
  if (playerId === viewer.player?.id) return { errors: ["That name is already your profile."] };
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
  return {
    ok: viewer.player
      ? "Claim sent! When an organizer confirms it, this profile is merged into that name."
      : "Claim sent! An organizer will confirm it, usually at the next game night.",
  };
}

export async function withdrawClaim(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const supabase = await createServerSupabase();
  await supabase.from("player_claims").delete().eq("user_id", viewer.userId);
  refresh();
}

/** The signed-in person removes their own login and email. Their league history stays under their player name. */
export async function deleteMyAccount(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (text(formData, "confirm") !== "DELETE") return { errors: ["Type DELETE to confirm."] };

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("[delete-account] failed:", error.code, error.message);
    if (error.code === "P0001") return { errors: [error.message] };
    if (error.code === "PGRST202") return { errors: ["Account deletion isn't switched on yet. Please tell an organizer."] };
    return { errors: ["Couldn't delete your account. Nothing was changed."] };
  }

  // The login no longer exists; clear the session cookies that pointed at it.
  await supabase.auth.signOut();
  refresh();
  redirect("/");
}
