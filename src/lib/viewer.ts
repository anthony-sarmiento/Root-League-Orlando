import { cache } from "react";
import type { Player } from "./league";
import { asFactionId } from "./profile";
import { isSupabaseConfigured } from "./supabase/config";
import { createServerSupabase } from "./supabase/server";

export interface PendingClaim {
  playerId: string;
  playerName: string;
  note: string | null;
}

/** The signed-in visitor, with their player profile (if any) and organizer status. */
export interface Viewer {
  userId: string;
  email: string | null;
  player: Player | null;
  isAdmin: boolean;
  claim: PendingClaim | null;
}

interface PlayerJoin {
  id: string;
  name: string;
  bio: string | null;
  favorite_faction: string | null;
  avatar: string | null;
}

// Supabase returns a joined row as an object or a one-item array depending on the relation.
const one = <T,>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null));

/**
 * Who is looking at the page? `null` when signed out or when the database isn't connected.
 * Cached per request, so the header and the page share one lookup.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [link, admin, claim] = await Promise.all([
    supabase
      .from("player_accounts")
      .select("players(id, name, bio, favorite_faction, avatar)")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.rpc("is_admin"),
    supabase.from("player_claims").select("player_id, note, players(name)").eq("user_id", user.id).maybeSingle(),
  ]);

  // Errors here (e.g. the accounts migration hasn't been run yet) just mean "no profile".
  const profile = one(link.data?.players as PlayerJoin | PlayerJoin[] | null | undefined);
  const claimPlayer = one(claim.data?.players as { name: string } | { name: string }[] | null | undefined);

  return {
    userId: user.id,
    email: user.email ?? null,
    isAdmin: admin.data === true,
    player: profile
      ? {
          id: profile.id,
          name: profile.name,
          bio: profile.bio ?? undefined,
          favoriteFaction: asFactionId(profile.favorite_faction),
          avatar: profile.avatar ?? undefined,
        }
      : null,
    claim: claim.data
      ? { playerId: claim.data.player_id, playerName: claimPlayer?.name ?? "Unknown", note: claim.data.note }
      : null,
  };
});
