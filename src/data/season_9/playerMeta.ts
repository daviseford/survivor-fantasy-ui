import type { PlayerMeta } from "../../types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used only in typeof for type derivation
const _playerNames = [
  "Brady Finta",
  "Brook Geraghty",
  "Bubba Sampson",
  "Chad Crittenden",
  "Chris Daugherty",
  "John Kenney",
  "John Palyok",
  "Lea Masters",
  "Rory Freeman",
  "Ami Cusack",
  "Dolly Neely",
  "Eliza Orlins",
  "Julie Berry",
  "Leann Slaby",
  "Lisa Keiffer",
  "Mia Galeotalanza",
  "Scout Cloud Lee",
  "Twila Tanner",
] as const;
type PlayerName = (typeof _playerNames)[number];

export const SEASON_9_PLAYER_META: Partial<Record<PlayerName, PlayerMeta>> = {};
