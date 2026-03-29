import { useCompetition } from "../../hooks/useCompetition";
import { useEliminations } from "../../hooks/useEliminations";
import { useEvents } from "../../hooks/useEvents";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useSeason } from "../../hooks/useSeason";
import { getNumberWithOrdinal } from "../../utils/misc";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export const SeasonTotalContestantScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: events } = useEvents(season?.id);

  const { survivorPointsTotalSeason } = useScoringCalculations();

  const rows = Object.entries(survivorPointsTotalSeason)
    .sort((a, b) => b[1] - a[1])
    .map(([playerName, seasonScore]) => {
      const playerData = season?.players.find((x) => x.name === playerName);

      const draftPick = competition?.draft_picks.find(
        (x) => x.player_name === playerName,
      );

      const draftedBy = competition?.participants.find(
        (x) => x.uid === draftPick?.user_uid,
      );

      const playerElimination = Object.values(eliminations).find(
        (x) => x.player_name === playerName,
      );

      const isRemovedFromGame =
        playerElimination &&
        (playerElimination.variant === "medical" ||
          playerElimination.variant === "quitter");

      const isFTCEliminated =
        playerElimination &&
        playerElimination.variant === "final_tribal_council";

      const isWinner = Object.values(events).some(
        (x) => x.player_name === playerName && x.action === "win_survivor",
      );

      const rowClass = playerElimination
        ? "bg-muted/50"
        : isWinner
          ? "bg-green-50"
          : "";

      return (
        <TableRow key={playerName} className={rowClass}>
          <TableCell className="w-60">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={playerData?.img} />
                <AvatarFallback>{playerName[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{playerName}</span>
            </div>
          </TableCell>
          <TableCell className="w-10">{seasonScore}</TableCell>
          <TableCell>{draftedBy?.displayName || draftedBy?.email}</TableCell>
          <TableCell>{draftPick?.order}</TableCell>
          <TableCell>
            {playerElimination && (
              <Badge
                variant={
                  isFTCEliminated
                    ? "default"
                    : isRemovedFromGame
                      ? "destructive"
                      : "secondary"
                }
              >
                {isFTCEliminated
                  ? "Final Tribal"
                  : isRemovedFromGame
                    ? "Removed"
                    : "Eliminated"}{" "}
                {!isFTCEliminated
                  ? getNumberWithOrdinal(playerElimination.order)
                  : ""}
              </Badge>
            )}
          </TableCell>
        </TableRow>
      );
    });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Player Name</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Drafted By</TableHead>
          <TableHead>Pick #</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{rows}</TableBody>
    </Table>
  );
};
