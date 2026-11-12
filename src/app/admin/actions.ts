"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/admin";
import { isUuid } from "@/lib/email";
import { cleanPlayerName } from "@/lib/player-name";
import { parseGameForm, toRpcResults } from "@/lib/game-form-data";
import { validateGameInput, type GameInput } from "@/lib/game-input";
import { validateSeasonInput } from "@/lib/season-input";

export interface FormState {
  ok?: string;
  errors?: string[];
  /** Changes with every successful save, so a form can tell this save from the last one. */
  nonce?: number;
}

const NOT_ADMIN: FormState = { errors: ["Only league organizers can do that."] };
const refresh = () => revalidatePath("/", "layout");

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
/** An id from a form: a real UUID, or empty (which every caller already treats as "nothing chosen"). */
const idField = (formData: FormData, key: string) => {
  const value = text(formData, key);
  return isUuid(value) ? value : "";
};

/** Checks a table against the league (players exist, night exists) and returns its results ready for the database. */
async function checkGame(
  supabase: NonNullable<Awaited<ReturnType<typeof requireAdminForAction>>>["supabase"],
  input: GameInput,
): Promise<{ errors: string[] } | { errors: []; rpcResults: object[] }> {
  const { data: players, error: playersError } = await supabase.from("players").select("id");
  if (playersError) return { errors: ["Couldn't check the player list. Try again."] };

  // A game attached to a game night is always dated that night.
  if (input.sessionId) {
    const { data: session } = await supabase.from("sessions").select("date").eq("id", input.sessionId).single();
    if (!session) return { errors: ["That game night no longer exists."] };
    input.playedOn = session.date;
  }

  const errors = validateGameInput(input, new Set((players ?? []).map((p) => p.id)));
  if (errors.length) return { errors };

  return { errors: [], rpcResults: toRpcResults(input) };
}

export async function logGame(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;
  const { supabase } = admin;

  const input = parseGameForm(formData);
  const checked = await checkGame(supabase, input);
  if (checked.errors.length || !("rpcResults" in checked)) return { errors: checked.errors };

  const { error } = await supabase.rpc("log_game", {
    p_played_on: input.playedOn,
    p_session_id: input.sessionId,
    p_results: checked.rpcResults,
    p_round: input.round ?? 1,
  });
  if (error) {
    console.error("[log-game] failed:", error.code, error.message);
    // PGRST202: the database doesn't have the rounds migration yet, so the old function can't take a round.
    if (error.code === "PGRST202") {
      return { errors: ["The database needs its latest update (migration 0007) before tables and rounds can be saved."] };
    }
    return { errors: ["Couldn't save the game. Nothing was recorded — please try again."] };
  }

  refresh();
  return { ok: "Table saved! Standings are updated.", nonce: Date.now() };
}

/** Changes an existing table: its players, factions, finishing order, night or round. */
export async function updateGame(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;
  const { supabase } = admin;

  const gameId = idField(formData, "gameId");
  if (!gameId) return { errors: ["Pick a table to edit."] };

  const input = parseGameForm(formData);
  const checked = await checkGame(supabase, input);
  if (checked.errors.length || !("rpcResults" in checked)) return { errors: checked.errors };

  const { error } = await supabase.rpc("update_game", {
    p_game_id: gameId,
    p_played_on: input.playedOn,
    p_session_id: input.sessionId,
    p_results: checked.rpcResults,
    p_round: input.round ?? 1,
  });
  if (error) {
    console.error("[update-game] failed:", error.code, error.message);
    if (error.code === "PGRST202") {
      return { errors: ["The database needs its latest update (migration 0007) before tables can be edited."] };
    }
    return { errors: [error.message === "Game not found" ? "That table no longer exists." : "Couldn't save your changes. Nothing was changed."] };
  }

  refresh();
  return { ok: "Table updated.", nonce: Date.now() };
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

  const id = idField(formData, "playerId");
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

  const id = idField(formData, "playerId");
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

/**
 * Approves a player's report, using the organizer's final version of the table (so a mistake can be fixed on the
 * way through). The table only counts toward the standings from this moment.
 */
export async function approveReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;
  const { supabase } = admin;

  const reportId = idField(formData, "reportId");
  if (!reportId) return { errors: ["Pick a report to approve."] };

  const input = parseGameForm(formData);
  const checked = await checkGame(supabase, input);
  if (checked.errors.length || !("rpcResults" in checked)) return { errors: checked.errors };

  const { error } = await supabase.rpc("approve_game_report", {
    p_report_id: reportId,
    p_played_on: input.playedOn,
    p_session_id: input.sessionId,
    p_results: checked.rpcResults,
    p_round: input.round ?? 1,
  });
  if (error) {
    console.error("[approve-report] failed:", error.code, error.message);
    return {
      errors: [
        error.message.includes("already reviewed")
          ? "That report was already reviewed."
          : "Couldn't approve that report. Nothing was recorded.",
      ],
    };
  }

  refresh();
  return { ok: "Approved. The table is on the books.", nonce: Date.now() };
}

/** What an organizer sees after a connect or merge: how much moved. */
function movedSummary(result: unknown): string {
  const r = (result ?? {}) as { games?: number; signups?: number; already?: boolean };
  if (r.already) return "That account was already connected to that name.";
  const parts = [] as string[];
  if (r.games) parts.push(`${r.games} ${r.games === 1 ? "game" : "games"}`);
  if (r.signups) parts.push(`${r.signups} ${r.signups === 1 ? "RSVP" : "RSVPs"}`);
  return parts.length ? `Done. Moved ${parts.join(" and ")}.` : "Done.";
}

/** The database's own checks raise readable messages (for example "They both played in the same game"). */
function connectError(error: { code?: string; message: string }): string {
  if (error.code === "PGRST202") return "The database needs its latest update (migration 0009) before accounts can be connected.";
  if (error.code === "P0001") return error.message;
  return "Couldn't do that. Nothing was changed.";
}

/** Connects an account to a name. If the account has a different profile, it is merged into that name. */
export async function connectAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;

  const userId = idField(formData, "userId");
  const playerId = idField(formData, "playerId");
  if (!userId || !playerId) return { errors: ["Pick an account and a name."] };

  const { data, error } = await admin.supabase.rpc("link_account_to_player", { p_user_id: userId, p_player_id: playerId });
  if (error) {
    console.error("[connect-account] failed:", error.code, error.message);
    return { errors: [connectError(error)] };
  }
  refresh();
  return { ok: movedSummary(data), nonce: Date.now() };
}

/** Folds a duplicate name into the one to keep: games, RSVPs, reports and accounts move over. */
export async function mergePlayers(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;

  const sourceId = idField(formData, "sourceId");
  const targetId = idField(formData, "targetId");
  if (!sourceId || !targetId) return { errors: ["Pick the duplicate and the name to keep."] };

  const { data, error } = await admin.supabase.rpc("merge_players", { p_source: sourceId, p_target: targetId });
  if (error) {
    console.error("[merge-players] failed:", error.code, error.message);
    return { errors: [connectError(error)] };
  }
  refresh();
  return { ok: movedSummary(data), nonce: Date.now() };
}

/**
 * Shows one account's full email to an organizer, on request. Emails are masked everywhere on the page; this is the
 * only way to see one, and every look is written to the server log (who looked at which account, never the address).
 */
export async function revealEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;

  const userId = idField(formData, "userId");
  if (!userId) return { errors: ["Pick an account."] };

  const { data, error } = await admin.supabase.rpc("list_accounts");
  const row = Array.isArray(data) ? (data as { user_id: string; email: string }[]).find((a) => a.user_id === userId) : undefined;
  if (error || !row) return { errors: ["Couldn't look that account up."] };

  console.info("[reveal-email] organizer", admin.user.id, "viewed account", userId);
  return { ok: row.email };
}

/** Turns a report down, with an optional reason the player can read. */
export async function rejectReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;

  const reportId = idField(formData, "reportId");
  const reason = text(formData, "reason");
  if (!reportId) return { errors: ["Pick a report to reject."] };
  if (reason.length > 280) return { errors: ["Keep the reason under 280 characters."] };

  const { data, error } = await admin.supabase
    .from("game_reports")
    .update({ status: "rejected", reject_reason: reason || null, reviewed_by: admin.user.id, reviewed_at: new Date().toISOString() })
    .eq("id", reportId)
    .eq("status", "pending")
    .select("id");
  if (error || !data || data.length === 0) return { errors: ["That report was already reviewed."] };

  refresh();
  return { ok: "Report rejected.", nonce: Date.now() };
}

/** Changes a game night's date, title or place. Its tables move with it only if the date is unchanged. */
export async function updateSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;

  const id = text(formData, "sessionId");
  const date = text(formData, "date");
  const title = text(formData, "title") || "Root League Night";
  const location = text(formData, "location") || "GEEK'D Orlando";
  if (!id) return { errors: ["Pick a game night to edit."] };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { errors: ["Pick a valid date."] };
  if (title.length > 80 || location.length > 80) return { errors: ["Keep the title and place under 80 characters."] };

  const { data, error } = await admin.supabase
    .from("sessions")
    .update({ date, title, location })
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) return { errors: ["Couldn't save that game night."] };

  // Tables on this night are dated by it, so they follow the new date.
  await admin.supabase.from("games").update({ played_on: date }).eq("session_id", id);

  refresh();
  return { ok: "Game night saved." };
}

/** Removes a game night. Its tables stay on the books (and in the standings) but are no longer tied to a night. */
export async function deleteSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdminForAction();
  if (!admin) return NOT_ADMIN;
  const id = text(formData, "sessionId");
  if (!id) return { errors: ["Pick a game night to remove."] };

  const { data, error } = await admin.supabase.from("sessions").delete().eq("id", id).select("id");
  if (error) return { errors: ["Couldn't remove that game night."] };
  if (!data || data.length === 0) return { errors: ["That game night was already removed."] };
  refresh();
  return { ok: "Game night removed." };
}

export async function deleteGame(formData: FormData): Promise<void> {
  const admin = await requireAdminForAction();
  if (!admin) return;
  const id = idField(formData, "gameId");
  if (!id) return;
  await admin.supabase.from("games").delete().eq("id", id);
  refresh();
}

/** Organizer confirms that an account owns an existing player name. */
export async function approveClaim(formData: FormData): Promise<void> {
  const admin = await requireAdminForAction();
  if (!admin) return;
  const userId = idField(formData, "userId");
  if (!userId) return;
  const { error } = await admin.supabase.rpc("approve_claim", { p_user_id: userId });
  if (error) console.error("[approve-claim] failed:", error.code, error.message);
  refresh();
}

export async function rejectClaim(formData: FormData): Promise<void> {
  const admin = await requireAdminForAction();
  if (!admin) return;
  const userId = idField(formData, "userId");
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
