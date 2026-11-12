"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/admin";
import { cleanPlayerName } from "@/lib/player-name";
import { validateGameInput, type GameInput } from "@/lib/game-input";
import { PLACEMENTS, type FactionId } from "@/lib/league";
import { validateSeasonInput } from "@/lib/season-input";

export interface FormState {
  ok?: string;
  errors?: string[];
}

const NOT_ADMIN: FormState = { errors: ["Only league organizers can do that."] };
const refresh = () => revalidatePath("/", "layout");

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function logGame(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;
  const { supabase } = admin;

  const sessionId = text(formData, "sessionId") || null;
  let playedOn = text(formData, "playedOn");

  // Seat order is finishing order: seat 1 = 1st place, and so on.
  const input: GameInput = {
    playedOn,
    sessionId,
    results: PLACEMENTS.map((placement, i) => ({
      playerId: text(formData, `player-${i}`),
      faction: text(formData, `faction-${i}`) as FactionId,
      placement,
    })),
  };

  const { data: players, error: playersError } = await supabase.from("players").select("id");
  if (playersError) return { errors: ["Couldn't check the player list. Try again."] };

  // A game attached to a game night is always dated that night.
  if (sessionId) {
    const { data: session } = await supabase.from("sessions").select("date").eq("id", sessionId).single();
    if (!session) return { errors: ["That game night no longer exists."] };
    playedOn = session.date;
    input.playedOn = playedOn;
  }

  const errors = validateGameInput(input, new Set((players ?? []).map((p) => p.id)));
  if (errors.length) return { errors };

  const { error } = await supabase.rpc("log_game", {
    p_played_on: input.playedOn,
    p_session_id: input.sessionId,
    p_results: input.results.map((r) => ({
      player_id: r.playerId,
      faction: r.faction,
      placement: r.placement,
    })),
  });
  if (error) return { errors: ["Couldn't save the game. Nothing was recorded — please try again."] };

  refresh();
  return { ok: "Game logged! Standings are updated." };
}

export async function addPlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;

  const { name, error: nameError } = cleanPlayerName(text(formData, "name"));
  if (nameError) return { errors: [nameError] };

  const { error } = await admin.supabase.from("players").insert({ name });
  if (error) return { errors: [playerWriteError(error.code, name, "add")] };
  refresh();
  return { ok: `${name} joined the league.` };
}

/** Turns a database error from a player write into something an organizer can act on. */
function playerWriteError(code: string | undefined, name: string, verb: "add" | "rename"): string {
  if (code === "23505") return `"${name}" is already in the league (names can't match another player, even in different capitals).`;
  if (code === "23514") return "That name has characters the league doesn't allow. Use letters, numbers, spaces and . ' _ - only.";
  return `Couldn't ${verb} that player.`;
}

/** Organizers can fix a player's name, for example a typo or a nickname change. History stays attached. */
export async function renamePlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;

  const id = text(formData, "playerId");
  if (!id) return { errors: ["Pick a player to rename."] };
  const { name, error: nameError } = cleanPlayerName(text(formData, "name"));
  if (nameError) return { errors: [nameError] };

  const { data, error } = await admin.supabase.from("players").update({ name }).eq("id", id).select("id");
  if (error) return { errors: [playerWriteError(error.code, name, "rename")] };
  if (!data || data.length === 0) return { errors: ["That player no longer exists."] };
  refresh();
  return { ok: `Renamed to ${name}.` };
}

/**
 * Removes a player who has no games on record. A player with games can't be removed, because every game needs
 * exactly four players: delete their games first (under Recent games) and then remove them.
 */
export async function deletePlayer(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;

  const id = text(formData, "playerId");
  if (!id) return { errors: ["Pick a player to remove."] };

  const { count, error: countError } = await admin.supabase
    .from("game_results")
    .select("id", { count: "exact", head: true })
    .eq("player_id", id);
  if (countError) return { errors: ["Couldn't check that player's games. Try again."] };
  if ((count ?? 0) > 0) {
    return {
      errors: [
        `They have ${count} ${count === 1 ? "game" : "games"} on record. Delete ${count === 1 ? "that game" : "those games"} under Recent games first, then remove the player.`,
      ],
    };
  }

  const { data, error } = await admin.supabase.from("players").delete().eq("id", id).select("id");
  if (error) {
    console.error("[delete-player] failed:", error.code, error.message);
    return { errors: ["Couldn't remove that player."] };
  }
  if (!data || data.length === 0) return { errors: ["That player was already removed."] };
  refresh();
  return { ok: "Player removed." };
}

export async function addSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;

  const date = text(formData, "date");
  const title = text(formData, "title") || "Root League Night";
  const location = text(formData, "location") || "GEEK'D Orlando";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return { errors: ["Pick a valid date."] };
  }

  const { error } = await admin.supabase.from("sessions").insert({ date, title, location });
  if (error) return { errors: ["Couldn't add that game night."] };
  refresh();
  return { ok: "Game night added." };
}

export async function deleteGame(formData: FormData): Promise<void> {
  const admin = await requireAdminForAction();
  if (!admin) return;
  const id = text(formData, "gameId");
  if (!id) return;
  await admin.supabase.from("games").delete().eq("id", id);
  refresh();
}

/** Organizer confirms that an account owns an existing player name. */
export async function approveClaim(formData: FormData): Promise<void> {
  const admin = await requireAdminForAction();
  if (!admin) return;
  const userId = text(formData, "userId");
  if (!userId) return;
  const { error } = await admin.supabase.rpc("approve_claim", { p_user_id: userId });
  if (error) console.error("[approve-claim] failed:", error.code, error.message);
  refresh();
}

export async function rejectClaim(formData: FormData): Promise<void> {
  const admin = await requireAdminForAction();
  if (!admin) return;
  const userId = text(formData, "userId");
  if (!userId) return;
  await admin.supabase.from("player_claims").delete().eq("user_id", userId);
  refresh();
}

/** Adds a season, or changes the dates of an existing one (matched by number). */
export async function saveSeason(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;

  const candidate = {
    number: Number(text(formData, "number")),
    startsOn: text(formData, "startsOn"),
    endsOn: text(formData, "endsOn"),
  };

  const { data: rows, error: loadError } = await admin.supabase.from("seasons").select("number, starts_on, ends_on");
  if (loadError) return { errors: ["Couldn't load the existing seasons. Try again."] };
  const existing = (rows ?? []).map((r) => ({ number: r.number, startsOn: r.starts_on, endsOn: r.ends_on }));

  const errors = validateSeasonInput(candidate, existing);
  if (errors.length) return { errors };

  const { error } = await admin.supabase
    .from("seasons")
    .upsert({ number: candidate.number, starts_on: candidate.startsOn, ends_on: candidate.endsOn });
  if (error) return { errors: ["Couldn't save that season."] };

  refresh();
  return { ok: `Season ${candidate.number} saved.` };
}

export async function deleteSeason(formData: FormData): Promise<void> {
  const admin = await requireAdminForAction();
  if (!admin) return;
  const number = Number(text(formData, "number"));
  if (!Number.isInteger(number)) return;
  await admin.supabase.from("seasons").delete().eq("number", number);
  refresh();
}
