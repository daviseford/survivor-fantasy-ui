interface SeasonDocumentInput {
  seasonNum: number;
  seasonImg: string;
  players: unknown;
  episodes: unknown;
  castawayLookup: unknown;
  syncedAt?: Date;
}

export function buildSeasonDocument({
  seasonNum,
  seasonImg,
  players,
  episodes,
  castawayLookup,
  syncedAt = new Date(),
}: SeasonDocumentInput): Record<string, unknown> {
  return {
    id: `season_${seasonNum}`,
    order: seasonNum,
    name: `Survivor ${seasonNum}`,
    img: seasonImg,
    players,
    episodes,
    castawayLookup,
    last_synced_at: syncedAt.toISOString(),
  };
}
