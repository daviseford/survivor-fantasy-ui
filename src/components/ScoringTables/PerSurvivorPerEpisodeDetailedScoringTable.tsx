import { BASE_PLAYER_SCORING } from "../../data/scoring";
import { useCompetition } from "../../hooks/useCompetition";
import { useEliminations } from "../../hooks/useEliminations";
import { useEvents } from "../../hooks/useEvents";
import { useScoringCalculations } from "../../hooks/useScoringCalculations";
import { useSeason } from "../../hooks/useSeason";
import { PlayerAction } from "../../types";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";

export const PerSurvivorPerEpisodeDetailedScoringTable = () => {
  const { data: competition } = useCompetition();
  const { data: season } = useSeason(competition?.season_id);
  const { data: eliminations } = useEliminations(competition?.season_id);
  const { data: events } = useEvents(season?.id);

  const { survivorPointsByEpisode, survivorPointsTotalSeason } =
    useScoringCalculations();

  const scoringDescriptionLookup = BASE_PLAYER_SCORING.reduce(
    (accum, score) => {
      accum[score.action] = score.description;
      return accum;
    },
    {} as Record<PlayerAction, string>,
  );

  const rows = Object.entries(survivorPointsByEpisode)
    .sort(
      (a, b) =>
        survivorPointsTotalSeason[b[0]] - survivorPointsTotalSeason[a[0]],
    )
    .map(([playerName, episodeScores], i) => {
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
          <TableCell className="w-5">{i + 1}</TableCell>
          <TableCell className="w-60">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={playerData?.img}
                  className={playerElimination ? "grayscale" : ""}
                />
                <AvatarFallback>{playerName[0]}</AvatarFallback>
              </Avatar>
              <span
                className={`text-sm font-medium ${playerElimination ? "text-muted-foreground" : ""}`}
              >
                {playerName}
              </span>
            </div>
          </TableCell>
          <TableCell className="w-10">
            {survivorPointsTotalSeason[playerName]}
          </TableCell>
          {episodeScores.map((s, idx) => (
            <TableCell key={idx} className="w-30">
              <div className="flex flex-col gap-1">
                {s.actions.map((x, actionIdx) => {
                  const variant =
                    x.action === "eliminated" ? "destructive" : "secondary";

                  return (
                    <Tooltip key={actionIdx}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant={variant}
                          className="cursor-pointer text-xs"
                        >
                          {x.action.replace(/_/g, " ")} +{x.points_awarded}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {scoringDescriptionLookup[x.action]}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TableCell>
          ))}
          <TableCell className="w-38">
            Drafted {getNumberWithOrdinal(draftPick?.order || 0)} by{" "}
            {draftedBy?.displayName || draftedBy?.email}
          </TableCell>
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Total</TableHead>
            {season?.episodes.map((x) => (
              <TableHead key={x.id}>Ep {x.order}</TableHead>
            ))}
            <TableHead>Draft Pick</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{rows}</TableBody>
      </Table>
    </div>
  );
};
