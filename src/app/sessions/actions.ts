"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

/** Join or leave a game night as the signed-in player. The database re-checks everything (own player, future date). */
export async function setRsvp(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer?.player) return;

  const sessionId = String(formData.get("sessionId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!sessionId) return;

  const supabase = await createServerSupabase();
  if (intent === "join") {
    // A duplicate (double click) or a night that has passed is rejected by the database; nothing to report.
    await supabase.from("session_signups").insert({ session_id: sessionId, player_id: viewer.player.id });
  } else if (intent === "leave") {
    await supabase.from("session_signups").delete().eq("session_id", sessionId).eq("player_id", viewer.player.id);
  }
  revalidatePath("/", "layout");
}
