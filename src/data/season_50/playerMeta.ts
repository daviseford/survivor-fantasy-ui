import type { PlayerMeta } from "../../types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used only in typeof for type derivation
const _playerNames = [
  "Jenna Lewis-Dougherty",
  "Colby Donaldson",
  "Stephenie LaGrossa Kendrick",
  "Cirie Fields",
  "Ozzy Lusth",
  'Benjamin "Coach" Wade',
  "Aubry Bracco",
  "Chrissy Hofbeck",
  "Christian Hubicki",
  "Angelina Keeley",
  "Mike White",
  "Rick Devens",
  "Jonathan Young",
  "Emily Flippen",
  "Dee Valladares",
  'Quintavius "Q" Burdette',
  "Charlie Davis",
  "Tiffany Ervin",
  "Genevieve Mushaluk",
  "Kyle Fraser",
  "Joe Hunter",
  "Kamilla Karthigesu",
  "Savannah Louie",
  "Rizo Velovic",
] as const;
type PlayerName = (typeof _playerNames)[number];

export const SEASON_50_PLAYER_META: Partial<Record<PlayerName, PlayerMeta>> =
  {};
