"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/admin";
import { validateGameInput, type GameInput } from "@/lib/game-input";
import { PLACEMENTS, type FactionId } from "@/lib/league";

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

  const name = text(formData, "name");
  if (!name) return { errors: ["Enter a player name."] };
  if (name.length > 40) return { errors: ["Keep names under 40 characters."] };

  const { error } = await admin.supabase.from("players").insert({ name });
  if (error) {
    return { errors: [error.code === "23505" ? `"${name}" is already in the league.` : "Couldn't add that player."] };
  }
  refresh();
  return { ok: `${name} joined the league.` };
}

export async function addSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;

  const date = text(formData, "date");
  const title = text(formData, "title") || "Root League Night";
  const location = text(formData, "location") || "Location TBA";
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
