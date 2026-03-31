import type { PlayerMeta } from "../../types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used only in typeof for type derivation
const _playerNames = [
  "Ben Katzman",
  "Bhanu Gopal",
  "Charlie Davis",
  "David Jelinsky",
  "Hunter McKnight",
  "Jem Hussain-Adams",
  "Jess Chong",
  "Kenzie Petty",
  "Liz Wilcox",
  "Maria Shrime Gonzalez",
  "Moriah Gaynor",
  "Q Burdette",
  "Randen Montalvo",
  "Soda Thompson",
  "Tevin Davis",
  "Tim Spicer",
  "Venus Vafa",
  "Tiffany Nicole Ervin",
] as const;
type PlayerName = (typeof _playerNames)[number];

export const SEASON_46_PLAYER_META: Partial<Record<PlayerName, PlayerMeta>> =
  {};
