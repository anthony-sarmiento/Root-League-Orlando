import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { PlayerGrid, type PlayerCardData } from "@/components/PlayerGrid";
import { getLeagueData } from "@/lib/data";
import { featuredSeason, todayISO } from "@/lib/seasons";
import { buildLeaderboard, buildPlayerProfile, gamesInSeason } from "@/lib/stats";

export const metadata: Metadata = { title: "Players" };
export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const { players, games, seasons } = await getLeagueData();
  const season = featuredSeason(seasons, todayISO());
  const seasonLp = new Map(
    (season ? buildLeaderboard(players, gamesInSeason(games, season)) : []).map((r) => [r.player.id, r.lp]),
  );
  const seasonName = season ? season.label.split(" · ")[0] : "This season";
  const cards: PlayerCardData[] = players.map((p) => {
    const profile = buildPlayerProfile(p, players, games, seasons);
    return {
      id: p.id,
      name: p.name,
      bio: p.bio,
      avatar: p.avatar,
      avatarBg: p.avatarBg,
      avatarCrop: p.avatarCrop,
      games: profile.games,
      wins: profile.wins,
      winrate: profile.winrate,
      lp: profile.lp,
      seasonLp: seasonLp.get(p.id) ?? 0,
      seasonName,
      faction: p.favoriteFaction ?? profile.bestFaction?.faction,
      factionIsFavorite: Boolean(p.favoriteFaction),
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Players"
        pattern="lizards"
        crew={[{ id: "sergeant-atheldrydd", w: 130 }, { id: "camdyn", w: 150 }, { id: "captain-ismay", w: 140, f: -1 }, { id: "odilie", w: 130, f: -1 }]}
        description="Everyone who has sat down at the table. Records cover every season."
      />
      <PlayerGrid players={cards} />
    </div>
  );
}
