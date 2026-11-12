"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/admin/actions";
import { parseGameForm, toRpcResults } from "@/lib/game-form-data";
import { validateGameInput } from "@/lib/game-input";
import { todayISO } from "@/lib/seasons";
import { createServerSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/** A player reports a table they played in. It waits for an organizer; nothing changes in the standings yet. */
export async function submitGameReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.player) return { errors: ["Create your player profile before reporting a game."] };

  const input = parseGameForm(formData);
  const note = text(formData, "note");
  if (note.length > 280) return { errors: ["Keep the note under 280 characters."] };

  const supabase = await createServerSupabase();

  // A table played on a game night is dated that night.
  if (input.sessionId) {
    const { data: session } = await supabase.from("sessions").select("date").eq("id", input.sessionId).single();
    if (!session) return { errors: ["That game night no longer exists."] };
    input.playedOn = session.date;
  }

  const errors = validateGameInput(input);
  if (!input.results.some((r) => r.playerId === viewer.player!.id)) {
    errors.push("You can only report a game you played in. Add yourself to the table.");
  }
  if (input.playedOn > todayISO()) errors.push("That date hasn't happened yet.");
  if (errors.length) return { errors };

  const { error } = await supabase.rpc("submit_game_report", {
    p_played_on: input.playedOn,
    p_session_id: input.sessionId,
    p_round: input.round ?? 1,
    p_results: toRpcResults(input),
    p_note: note || null,
  });
  if (error) {
    console.error("[submit-report] failed:", error.code, error.message);
    // PGRST202: the database doesn't have the reports migration yet.
    if (error.code === "PGRST202") return { errors: ["Game reports aren't switched on yet. Please tell an organizer."] };
    // The database's own checks raise readable messages (for example "You already have 5 reports waiting").
    if (error.code === "P0001") return { errors: [error.message] };
    return { errors: ["Couldn't send your report. Please try again."] };
  }

  revalidatePath("/report");
  revalidatePath("/admin");
  return { ok: "Thanks! An organizer will check it before it counts.", nonce: Date.now() };
}

/** A player takes back a report that hasn't been reviewed yet. */
export async function withdrawReport(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const id = text(formData, "reportId");
  if (!id) return;
  const supabase = await createServerSupabase();
  await supabase.from("game_reports").delete().eq("id", id).eq("status", "pending");
  revalidatePath("/report");
  revalidatePath("/admin");
}
